import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSignedUploadUrl, generateSignedReadUrl } from '../controllers/media.controller';

const router = Router();
router.use(authenticate);

router.post('/upload-url', getSignedUploadUrl);
router.post('/signed-url', generateSignedReadUrl);

export default router;
