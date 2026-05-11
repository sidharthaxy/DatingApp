import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getActiveStories,
  createStory,
  viewStory,
  reactToStory,
  getPrompts,
  createPrompt,
  deletePrompt,
  getActivityFeed
} from '../controllers/social.controller';

const router = Router();
router.use(authenticate);

// Stories
router.get('/stories', getActiveStories);
router.post('/stories', createStory);
router.post('/stories/:storyId/view', viewStory);
router.post('/stories/:storyId/react', reactToStory);

// Prompts
router.get('/prompts/:userId?', getPrompts);
router.post('/prompts', createPrompt);
router.delete('/prompts/:promptId', deletePrompt);

// Activity Feed
router.get('/activity', getActivityFeed);

export default router;
