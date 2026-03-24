import { Response } from 'express';
import { PrismaClient, SwipeType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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

    return res.status(200).json({ success: true, data: swipe });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
