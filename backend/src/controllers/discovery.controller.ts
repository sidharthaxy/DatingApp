import { Response } from 'express';
import { PrismaClient, RelationshipGoal } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { redisClient } from '../config/redis';
import crypto from 'crypto';
import { computeCompatibility } from '../services/compatibility.service';

const prisma = new PrismaClient();

export const getDiscoveryFeed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.is_profile_complete || !user?.kyc_video_url) {
      return res.status(403).json({ success: false, error: { code: 'DISCOVERY_GATED', message: 'You must complete your profile and upload KYC to access discovery.' } });
    }

    // 1. Parse Query Parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const maxDistanceKm = parseInt(req.query.distance as string) || 100;
    const minAge = parseInt(req.query.min_age as string) || 18;
    const maxAge = parseInt(req.query.max_age as string) || 100;
    const minHeight = req.query.min_height ? parseInt(req.query.min_height as string) : undefined;
    const maxHeight = req.query.max_height ? parseInt(req.query.max_height as string) : undefined;
    const recentlyActive = req.query.recently_active === 'true';
    const sort = (req.query.sort as string) || 'RELEVANCE';
    
    let interests: string[] = [];
    if (req.query.interests) interests = (req.query.interests as string).split(',');
    
    let goals: RelationshipGoal[] = [];
    if (req.query.relationship_goals) goals = (req.query.relationship_goals as string).split(',') as RelationshipGoal[];

    // 2. Cache Key Generation
    const queryHash = crypto.createHash('sha256').update(JSON.stringify(req.query)).digest('hex');
    const cacheKey = `discovery:${userId}:${queryHash}`;
    const cachedResult = await redisClient.get(cacheKey);

    if (cachedResult) {
      return res.status(200).json({ success: true, data: JSON.parse(cachedResult) });
    }

    // 3. Prisma Filtering
    let genderFilter = {};
    if (user.interested_in === 'MEN') genderFilter = { gender: 'MALE' };
    else if (user.interested_in === 'WOMEN') genderFilter = { gender: 'FEMALE' };

    const today = new Date();
    const minDob = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());

    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const users = await prisma.user.findMany({
      where: {
        NOT: { id: userId },
        status: 'APPROVED',
        discover_enabled: true,
        ...genderFilter,
        dob: { gte: minDob, lte: maxDob },
        ...(minHeight || maxHeight ? { height_cm: { gte: minHeight, lte: maxHeight } } : {}),
        ...(goals.length > 0 ? { relationship_goal: { in: goals } } : {}),
        ...(recentlyActive ? { last_login_at: { gte: activeThreshold } } : {}),
        ...(interests.length > 0 ? { user_interests: { some: { interest_id: { in: interests } } } } : {}),
        swipes_to: { none: { from_user: userId } }
      },
      include: { photos: true, user_interests: true }
    });

    // Load viewer's interests for compatibility scoring
    const viewerInterests = await prisma.userInterest.findMany({
      where: { user_id: userId! },
      select: { interest_id: true },
    });
    const viewerInterestIds = viewerInterests.map((ui) => ui.interest_id);

    // 4. In-memory Distance Filtering
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const userHasLocation = user.latitude != null && user.longitude != null;

    let mappedUsers = users.map(u => {
      let dist = 99999;
      if (userHasLocation && u.latitude != null && u.longitude != null) {
        dist = calculateDistance(user.latitude!, user.longitude!, u.latitude, u.longitude);
      }
      // Compute real compatibility score
      const { score } = computeCompatibility({
        viewerInterestIds,
        viewerGoal: user.relationship_goal ?? null,
        viewerDob: user.dob ?? null,
        viewerLat: user.latitude ?? null,
        viewerLng: user.longitude ?? null,
        targetInterestIds: u.user_interests.map((ui: any) => ui.interest_id),
        targetGoal: u.relationship_goal ?? null,
        targetDob: u.dob ?? null,
        targetLat: u.latitude ?? null,
        targetLng: u.longitude ?? null,
        targetLastLogin: u.last_login_at ?? null,
        targetBoostExpiresAt: u.boost_expires_at ?? null,
        targetTier: u.subscription_tier,
      });
      return { ...u, distance: dist, compatibility_score: score };
    });

    // If the requesting user has no location, skip distance filter
    let filteredUsers = userHasLocation
      ? mappedUsers.filter(u => u.distance <= maxDistanceKm)
      : mappedUsers;

    // 5. Sorting
    if (sort === 'DISTANCE') {
      filteredUsers.sort((a, b) => a.distance - b.distance);
    } else if (sort === 'ACTIVITY') {
      filteredUsers.sort((a, b) => {
        const timeA = a.last_login_at ? a.last_login_at.getTime() : 0;
        const timeB = b.last_login_at ? b.last_login_at.getTime() : 0;
        return timeB - timeA;
      });
    } else if (sort === 'AGE') {
      // Youngest first => DOB desc
      filteredUsers.sort((a, b) => {
        const tA = a.dob ? a.dob.getTime() : 0;
        const tB = b.dob ? b.dob.getTime() : 0;
        return tB - tA; 
      });
    } else {
      // RELEVANCE Algorithm
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const oneDay = 24 * 60 * 60 * 1000;

      const getScore = (u: any) => {
        let score = 0;
        if (u.boost_expires_at && u.boost_expires_at.getTime() > now) score += 50;
        if (now - u.created_at.getTime() < sevenDays) score += 30;
        if (u.last_login_at && now - u.last_login_at.getTime() < oneDay) score += 20;
        return score;
      };

      // Attach score to each user for later use in response
      const scoredUsers = filteredUsers.map(u => ({ ...u, match_score: getScore(u) }));

      scoredUsers.sort((a, b) => {
        if (b.match_score !== a.match_score) return b.match_score - a.match_score;
        return b.created_at.getTime() - a.created_at.getTime();
      });

      // 6. Pagination (RELEVANCE branch)
      const skip = (page - 1) * limit;
      const paginatedUsers = scoredUsers.slice(skip, skip + limit);

      const cleanUsers = paginatedUsers.map(({ distance, match_score, user_interests, compatibility_score, ...rest }) => ({
        ...rest,
        distance_km: Math.round(distance),
        match_pct: compatibility_score, // real score in RELEVANCE mode
      }));
      const responseData = { users: cleanUsers };
      await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
      return res.status(200).json({ success: true, data: responseData });
    }

    // 6. Pagination (DISTANCE / ACTIVITY / AGE branches)
    const skip = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    const cleanUsers = paginatedUsers.map(({ distance, user_interests, compatibility_score, ...rest }) => ({
      ...rest,
      distance_km: Math.round(distance),
      match_pct: compatibility_score, // real compatibility score
    }));
    const responseData = { users: cleanUsers };
    await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
    return res.status(200).json({ success: true, data: responseData });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
