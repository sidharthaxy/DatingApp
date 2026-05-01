import { Router } from 'express';
import { googleLogin, verifyFirebaseToken, logout, refreshToken } from '../controllers/auth.controller';

const router = Router();

router.post('/google', googleLogin);
router.post('/verify', verifyFirebaseToken);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

export default router;
