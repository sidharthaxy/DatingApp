import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSignedUploadUrl,
  uploadPhoto,
  uploadPhotoMiddleware,
  uploadKyc,
  uploadKycMiddleware,
  uploadChatMedia,
  uploadChatMediaMiddleware,
  generateSignedReadUrl,
  confirmPhotoUpload,
  confirmKycUpload,
} from '../controllers/media.controller';

const router = Router();
router.use(authenticate);

// Multipart uploads proxied through the API (what the apps use)
router.post('/upload', uploadPhotoMiddleware, uploadPhoto);
router.post('/kyc', uploadKycMiddleware, uploadKyc);
router.post('/chat-upload', uploadChatMediaMiddleware, uploadChatMedia);

// Presigned direct-to-storage flow
router.post('/upload-url', getSignedUploadUrl);
router.post('/signed-url', generateSignedReadUrl);
router.post('/upload-photo', confirmPhotoUpload);
router.post('/upload-kyc', confirmKycUpload);

export default router;
