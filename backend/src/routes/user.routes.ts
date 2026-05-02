import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe, updateMe, updateLocation, updatePreferences, toggleDiscover, updateInterests, updateFcmToken, boostUser, getInterests } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { updateMeSchema, updateLocationSchema, updateInterestsSchema, updateFcmTokenSchema } from '../validators/user.validator';

const router = Router();

// Apply authentication middleware to all user routes
router.use(authenticate);

router.get('/me', getMe);
router.put('/me', validate(updateMeSchema), updateMe);
router.post('/location', validate(updateLocationSchema), updateLocation);
router.post('/preferences', updatePreferences);
router.post('/interests', validate(updateInterestsSchema), updateInterests);
router.post('/discover-toggle', toggleDiscover);
router.post('/fcm-token', validate(updateFcmTokenSchema), updateFcmToken);
router.post('/boost', boostUser);
router.get('/interests/list', getInterests);

export default router;
