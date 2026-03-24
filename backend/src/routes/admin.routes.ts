import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getUsers, getUserDetails, approveUser, rejectUser } from '../controllers/admin.controller';

const router = Router();

// In a real iteration, verifyAdminRole middleware should be added here
router.use(authenticate);

router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);

export default router;
