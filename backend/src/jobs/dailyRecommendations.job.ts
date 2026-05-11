/**
 * dailyRecommendations.job.ts
 *
 * Runs at 9 AM every day (server local time) to pre-compute
 * recommendations for all active users and warm the Redis cache.
 *
 * Start this job by calling startDailyRecommendationsJob() once
 * from server.ts after the HTTP server starts.
 */
import { PrismaClient } from '@prisma/client';
import { computeRecommendations } from '../controllers/recommendations.controller';
import { redisClient } from '../config/redis';

const prisma = new PrismaClient();
const RECS_CACHE_TTL = 60 * 60 * 12; // 12 hours

/**
 * Returns milliseconds until the next 9:00 AM local time.
 */
function msUntilNextNineAM(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (now >= next) {
    // Already past 9 AM today — schedule for tomorrow
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runDailyJob() {
  console.log('[DailyRecs] Starting daily recommendation pre-computation...');
  const start = Date.now();

  try {
    // Get all active, profile-complete users
    const users = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        is_profile_complete: true,
      },
      select: { id: true },
    });

    console.log(`[DailyRecs] Computing recommendations for ${users.length} users...`);

    // Process in batches of 20 to avoid overwhelming the DB
    const BATCH_SIZE = 20;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async ({ id }) => {
          try {
            const result = await computeRecommendations(id);
            await redisClient.setEx(
              `recommendations:${id}`,
              RECS_CACHE_TTL,
              JSON.stringify(result)
            );
          } catch (err) {
            console.error(`[DailyRecs] Failed for user ${id}:`, err);
          }
        })
      );
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[DailyRecs] Done. Processed ${users.length} users in ${elapsed}s.`);
  } catch (err) {
    console.error('[DailyRecs] Job failed:', err);
  }
}

let jobTimer: NodeJS.Timeout | null = null;

export function startDailyRecommendationsJob() {
  const delay = msUntilNextNineAM();
  const nextRun = new Date(Date.now() + delay);
  console.log(`[DailyRecs] Job scheduled for ${nextRun.toLocaleString()} (in ${Math.round(delay / 60000)} mins)`);

  const scheduleNext = () => {
    jobTimer = setTimeout(async () => {
      await runDailyJob();
      // Schedule next run in 24 hours
      jobTimer = setTimeout(scheduleNext, 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
}

export function stopDailyRecommendationsJob() {
  if (jobTimer) {
    clearTimeout(jobTimer);
    jobTimer = null;
    console.log('[DailyRecs] Job stopped.');
  }
}

/**
 * For testing / manual trigger: run immediately without the scheduler.
 */
export { runDailyJob };
