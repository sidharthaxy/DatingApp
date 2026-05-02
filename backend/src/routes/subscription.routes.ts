import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createOrder, verifyPayment, handleWebhook, getMySubscription } from '../controllers/subscription.controller';

const router = Router();

// Webhook must use raw body — no auth middleware
router.post('/webhook', handleWebhook);

// Authenticated routes
router.use(authenticate);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/me', getMySubscription);

export default router;
