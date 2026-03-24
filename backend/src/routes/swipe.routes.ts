import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { swipeUser } from '../controllers/swipe.controller';

const router = Router();
router.use(authenticate);

router.post('/', swipeUser);

export default router;
