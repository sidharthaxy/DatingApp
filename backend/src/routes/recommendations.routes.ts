import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getRecommendations,
  getCompatibilityScore,
  refreshRecommendations,
} from '../controllers/recommendations.controller';

const router = Router();
router.use(authenticate);

/**
 * GET /api/v1/recommendations
 * Returns the user's daily AI-matched recommendations (9 picks).
 * Served from Redis cache; falls back to live computation.
 */
router.get('/', getRecommendations);

/**
 * GET /api/v1/recommendations/score/:targetId
 * Returns a detailed compatibility score breakdown between
 * the current user and the specified target.
 */
router.get('/score/:targetId', getCompatibilityScore);

/**
 * POST /api/v1/recommendations/refresh
 * Manually refreshes recommendations.
 * Rate-limited: FREE=1/day, PREMIUM=3/day, ELITE=unlimited.
 */
router.post('/refresh', refreshRecommendations);

export default router;
