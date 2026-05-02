import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Response } from 'express';
import { PrismaClient, SubscriptionTier, BillingCycle } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Prices in paise (INR × 100)
const PRICING: Record<SubscriptionTier, Partial<Record<BillingCycle, number>>> = {
  FREE:    {},
  PREMIUM: { WEEKLY: 19900, MONTHLY: 59900, QUARTERLY: 139900, YEARLY: 199900 },
  ELITE:   { WEEKLY: 39900, MONTHLY: 99900, QUARTERLY: 239900, YEARLY: 349900 },
};

// Duration in days per cycle
const DURATION_DAYS: Record<BillingCycle, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

/**
 * POST /api/v1/subscriptions/create-order
 * Creates a Razorpay order to start a checkout session.
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const { tier, billingCycle } = req.body as { tier: SubscriptionTier; billingCycle: BillingCycle };

    if (!tier || !billingCycle || tier === 'FREE') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Valid tier and billingCycle are required' } });
    }

    const amount = PRICING[tier]?.[billingCycle];
    if (!amount) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid tier/billingCycle combination' } });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${userId}_${Date.now()}`,
      notes: { userId, tier, billingCycle },
    });

    // Track this order in our DB
    const payment = await prisma.payment.create({
      data: {
        user_id: userId,
        razorpay_order_id: order.id,
        amount,
        status: 'CREATED',
        tier,
        billing_cycle: billingCycle,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment.id,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

/**
 * POST /api/v1/subscriptions/verify-payment
 * Called by the client after Razorpay checkout to verify signature and activate subscription.
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing payment verification fields' } });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } });
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { razorpay_order_id },
    });

    if (!payment || payment.user_id !== userId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment record not found' } });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DURATION_DAYS[payment.billing_cycle]);

    // Atomic transaction: mark payment paid, create subscription, upgrade user tier
    const [updatedPayment, subscription] = await prisma.$transaction([
      prisma.payment.update({
        where: { razorpay_order_id },
        data: {
          razorpay_payment_id,
          razorpay_signature,
          status: 'PAID',
        },
      }),
      prisma.subscription.create({
        data: {
          user_id: userId,
          tier: payment.tier,
          billing_cycle: payment.billing_cycle,
          status: 'ACTIVE',
          expires_at: expiresAt,
        },
      }),
    ]);

    // Upgrade user tier
    await prisma.user.update({
      where: { id: userId },
      data: { subscription_tier: payment.tier },
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Payment verified! Subscription activated.',
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          expires_at: subscription.expires_at,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

/**
 * POST /api/v1/subscriptions/webhook
 * Razorpay webhook for server-side payment event handling.
 */
export const handleWebhook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'] as string;
      const body = JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSig) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE' } });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      // Find payment by order_id and mark as PAID if not already
      const orderId = paymentEntity.order_id;
      await prisma.payment.updateMany({
        where: { razorpay_order_id: orderId, status: 'CREATED' },
        data: { status: 'PAID', razorpay_payment_id: paymentEntity.id },
      });
    }

    if (event === 'payment.failed' && paymentEntity) {
      const orderId = paymentEntity.order_id;
      await prisma.payment.updateMany({
        where: { razorpay_order_id: orderId },
        data: { status: 'FAILED' },
      });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

/**
 * GET /api/v1/subscriptions/me
 * Returns the authenticated user's active subscription.
 */
export const getMySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscription_tier: true },
    });

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        expires_at: { gt: new Date() },
      },
      orderBy: { expires_at: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: {
        tier: user?.subscription_tier ?? 'FREE',
        subscription: activeSubscription ?? null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
