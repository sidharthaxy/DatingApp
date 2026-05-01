import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSignedUploadUrl, generateSignedReadUrl, confirmPhotoUpload, confirmKycUpload } from '../controllers/media.controller';

const router = Router();
router.use(authenticate);

router.post('/upload-url', getSignedUploadUrl);
router.post('/signed-url', generateSignedReadUrl);
router.post('/upload-photo', confirmPhotoUpload);
router.post('/upload-kyc', confirmKycUpload);

export default router;
