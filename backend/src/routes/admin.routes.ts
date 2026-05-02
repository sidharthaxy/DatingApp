import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getAppeals, resolveAppeal } from '../controllers/appeal.controller';
import { getUsers, getUserDetails, approveUser, rejectUser, getReports, resolveReport } from '../controllers/admin.controller';

const router = Router();

// In a real iteration, verifyAdminRole middleware should be added here
router.use(authenticate);

router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);

router.get('/reports', getReports);
router.post('/reports/:reportId/resolve', resolveReport);

router.get('/appeals', getAppeals);
router.post('/appeals/:appealId/resolve', resolveAppeal);

export default router;
