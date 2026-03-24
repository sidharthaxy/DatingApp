import { Router } from 'express';
import { googleLogin, phoneLogin } from '../controllers/auth.controller';

const router = Router();

router.post('/google', googleLogin);
router.post('/phone', phoneLogin);

export default router;
