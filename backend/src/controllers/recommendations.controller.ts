import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { redisClient } from '../config/redis';
import { computeCompatibility } from '../services/compatibility.service';

const prisma = new PrismaClient();
const RECS_CACHE_TTL = 60 * 60 * 12; // 12 hours
const RECS_LIMIT = 9;

/**
 * GET /api/v1/recommendations
 * Returns the current user's pre-computed daily recommendations.
 * Falls back to a live computation if none are cached.
 */
export const getRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const cacheKey = `recommendations:${userId}`;

    // 1. Try Redis cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: JSON.parse(cached) });
    }

    // 2. Live computation fallback
    const result = await computeRecommendations(userId);
    await redisClient.setEx(cacheKey, RECS_CACHE_TTL, JSON.stringify(result));

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

/**
 * GET /api/v1/recommendations/score/:targetId
 * Returns the compatibility score between the current user and a specific target.
 */
export const getCompatibilityScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { targetId } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    if (!targetId) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });

    const [viewer, target] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { user_interests: true },
      }),
      prisma.user.findUnique({
        where: { id: targetId },
        include: { user_interests: true },
      }),
    ]);

    if (!viewer || !target) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }

    const result = computeCompatibility({
      viewerInterestIds: viewer.user_interests.map((ui) => ui.interest_id),
      viewerGoal: viewer.relationship_goal ?? null,
      viewerDob: viewer.dob ?? null,
      viewerLat: viewer.latitude ?? null,
      viewerLng: viewer.longitude ?? null,
      targetInterestIds: target.user_interests.map((ui) => ui.interest_id),
      targetGoal: target.relationship_goal ?? null,
      targetDob: target.dob ?? null,
      targetLat: target.latitude ?? null,
      targetLng: target.longitude ?? null,
      targetLastLogin: target.last_login_at ?? null,
      targetBoostExpiresAt: target.boost_expires_at ?? null,
      targetTier: target.subscription_tier,
    });

    return res.status(200).json({ success: true, data: { target_id: targetId, ...result } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

/**
 * POST /api/v1/recommendations/refresh
 * Manually triggers recommendation recomputation for the current user.
 * Rate-limited by subscription tier: FREE = 1/day, PREMIUM = 3/day, ELITE = unlimited.
 */
export const refreshRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscription_tier: true } });
    const tier = user?.subscription_tier ?? 'FREE';

    // Rate-limit: count refreshes today
    const refreshCountKey = `rec_refresh_count:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const currentCount = parseInt((await redisClient.get(refreshCountKey)) ?? '0');
    const maxRefreshes = tier === 'ELITE' ? Infinity : tier === 'PREMIUM' ? 3 : 1;

    if (currentCount >= maxRefreshes) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `You've used all your daily recommendation refreshes. Upgrade for more.`,
        },
      });
    }

    // Recompute
    const cacheKey = `recommendations:${userId}`;
    const result = await computeRecommendations(userId);
    await redisClient.setEx(cacheKey, RECS_CACHE_TTL, JSON.stringify(result));

    // Increment refresh count (TTL = end of day)
    const secondsUntilMidnight =
      86400 - (new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds());
    await redisClient.set(refreshCountKey, String(currentCount + 1), { EX: secondsUntilMidnight });

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

/**
 * Core recommendation computation:
 * Scores all eligible users using the compatibility algorithm,
 * picks the top RECS_LIMIT and enriches with distance_km.
 */
export async function computeRecommendations(userId: string) {
  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    include: { user_interests: true },
  });

  if (!viewer) return { recommendations: [], generated_at: new Date().toISOString() };

  // Gender filter
  let genderFilter: any = {};
  if (viewer.interested_in === 'MEN') genderFilter = { gender: 'MALE' };
  else if (viewer.interested_in === 'WOMEN') genderFilter = { gender: 'FEMALE' };

  // Candidate pool: approved, discoverable, not already swiped
  const candidates = await prisma.user.findMany({
    where: {
      NOT: { id: userId },
      status: 'APPROVED',
      discover_enabled: true,
      ...genderFilter,
      swipes_to: { none: { from_user: userId } },
    },
    include: { user_interests: true, photos: true },
    take: 200, // Cap candidate pool for performance
  });

  const viewerInterestIds = viewer.user_interests.map((ui) => ui.interest_id);

  // Score each candidate
  const scored = candidates.map((candidate) => {
    const { score, breakdown } = computeCompatibility({
      viewerInterestIds,
      viewerGoal: viewer.relationship_goal ?? null,
      viewerDob: viewer.dob ?? null,
      viewerLat: viewer.latitude ?? null,
      viewerLng: viewer.longitude ?? null,
      targetInterestIds: candidate.user_interests.map((ui) => ui.interest_id),
      targetGoal: candidate.relationship_goal ?? null,
      targetDob: candidate.dob ?? null,
      targetLat: candidate.latitude ?? null,
      targetLng: candidate.longitude ?? null,
      targetLastLogin: candidate.last_login_at ?? null,
      targetBoostExpiresAt: candidate.boost_expires_at ?? null,
      targetTier: candidate.subscription_tier,
    });

    // Compute distance_km
    let distance_km = 99999;
    if (
      viewer.latitude != null && viewer.longitude != null &&
      candidate.latitude != null && candidate.longitude != null
    ) {
      const R = 6371;
      const dLat = ((candidate.latitude - viewer.latitude) * Math.PI) / 180;
      const dLon = ((candidate.longitude - viewer.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((viewer.latitude * Math.PI) / 180) *
          Math.cos((candidate.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      distance_km = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    const { user_interests, ...rest } = candidate;
    return { ...rest, score, breakdown, distance_km };
  });

  // Sort descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, RECS_LIMIT);

  return {
    recommendations: top.map(({ score, breakdown, distance_km, photos, ...rest }) => ({
      ...rest,
      photos,
      compatibility_score: score,
      score_breakdown: breakdown,
      distance_km,
    })),
    generated_at: new Date().toISOString(),
  };
}
