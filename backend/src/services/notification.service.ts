import admin from '../config/firebase';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.fcm_token) return false;

    const message = {
      notification: { title, body },
      data: data || {},
      token: user.fcm_token,
    };

    await admin.messaging().send(message);
    return true;
  } catch (error: any) {
    console.error(`[FCM Error] Failed to send push to user ${userId}:`, error.message);
    
    // Automatically invalidate stale tokens
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { fcm_token: null }
      });
    }
    
    return false;
  }
};
