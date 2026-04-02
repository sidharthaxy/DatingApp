import { Router } from 'express';
import { googleLogin, verifyFirebaseToken, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/google', googleLogin);
router.post('/verify', verifyFirebaseToken);
router.post('/logout', logout);

export default router;
