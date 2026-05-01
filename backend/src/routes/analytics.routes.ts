import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { recordProfileView, getMyStats } from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate);

router.post('/view/:userId', recordProfileView);
router.get('/me', getMyStats);

export default router;
