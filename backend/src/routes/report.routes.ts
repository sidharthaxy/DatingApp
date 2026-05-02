import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { submitReport } from '../controllers/report.controller';

const router = Router();

router.use(authenticate);

router.post('/:targetId', submitReport);

export default router;
