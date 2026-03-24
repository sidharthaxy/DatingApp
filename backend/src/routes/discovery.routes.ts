import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getDiscoveryFeed } from '../controllers/discovery.controller';

const router = Router();
router.use(authenticate);

router.get('/', getDiscoveryFeed);

export default router;
