import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  triggerPanic
} from '../controllers/safety.controller';

const router = Router();
router.use(authenticate);

// Emergency Contacts
router.get('/emergency-contacts', getEmergencyContacts);
router.post('/emergency-contacts', addEmergencyContact);
router.delete('/emergency-contacts/:id', deleteEmergencyContact);

// Panic Button
router.post('/panic', triggerPanic);

export default router;
