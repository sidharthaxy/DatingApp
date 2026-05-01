import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getConversations, getMessages, sendMessage } from '../controllers/chat.controller';

const router = Router();
router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/messages/:partnerId', getMessages);
router.post('/send', sendMessage);

export default router;
