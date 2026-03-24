import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe, updateMe, updateLocation, updatePreferences, toggleDiscover } from '../controllers/user.controller';

const router = Router();

// Apply authentication middleware to all user routes
router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateMe);
router.post('/location', updateLocation);
router.post('/preferences', updatePreferences);
router.post('/discover-toggle', toggleDiscover);

export default router;
