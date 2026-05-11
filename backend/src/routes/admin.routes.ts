import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.middleware';
import { getAppeals, resolveAppeal } from '../controllers/appeal.controller';
import { getUsers, getUserDetails, approveUser, rejectUser, getReports, resolveReport, getDashboardStats } from '../controllers/admin.controller';
import { loginAdmin, changePassword, createAdmin, listAdmins } from '../controllers/adminAuth.controller';

const router = Router();

// Auth Routes (Public)
router.post('/auth/login', loginAdmin);

// Protected Admin Routes
router.use(requireAdmin);

// Auth Routes (Protected)
router.post('/auth/change-password', changePassword);
router.post('/users/add-admin', createAdmin);
router.get('/users/admins', listAdmins);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);

router.get('/reports', getReports);
router.post('/reports/:reportId/resolve', resolveReport);

router.get('/appeals', getAppeals);
router.post('/appeals/:appealId/resolve', resolveAppeal);

export default router;
