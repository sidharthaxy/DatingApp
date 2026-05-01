import { Response } from 'express';
import { PrismaClient, SwipeType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateDiscoveryCache } from '../config/redis';
import { sendPushNotification } from '../services/notification.service';

const prisma = new PrismaClient();

export const swipeUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { to_user_id, action } = req.body;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' }});
    if (!to_user_id || !action) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Target user and action required' } });
    }

    if (userId === to_user_id) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Cannot swipe self' } });
    }

    // Upsert to handle prevent duplicate
    const swipe = await prisma.swipe.upsert({
      where: {
        from_user_to_user: {
          from_user: userId,
          to_user: to_user_id,
        }
      },
      update: {
        type: action as SwipeType
      },
      create: {
        from_user: userId,
        to_user: to_user_id,
        type: action as SwipeType
      }
    });

    await invalidateDiscoveryCache(userId as string);

    let match = null;
    if (action === 'LIKE') {
      const mutualSwipe = await prisma.swipe.findUnique({
        where: {
          from_user_to_user: {
            from_user: to_user_id,
            to_user: userId
          }
        }
      });

      if (mutualSwipe && mutualSwipe.type === 'LIKE') {
        match = await prisma.match.findFirst({
          where: {
            OR: [
              { user1_id: userId, user2_id: to_user_id },
              { user1_id: to_user_id, user2_id: userId }
            ]
          }
        });

        if (!match) {
          match = await prisma.match.create({
            data: {
              user1_id: userId,
              user2_id: to_user_id
            }
          });

          await sendPushNotification(
            to_user_id,
            'New Match!',
            'You have a new match! Start a conversation now.',
            { type: 'MATCH', matchId: match.id }
          );
        }
      }
    }

    return res.status(200).json({ success: true, data: { swipe, match } });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
