import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { submitAppeal } from '../controllers/appeal.controller';

const router = Router();

router.use(authenticate);

// User side
router.post('/', submitAppeal);

export default router;
