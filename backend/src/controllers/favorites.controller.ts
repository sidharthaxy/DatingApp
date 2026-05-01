import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendPushNotification } from '../services/notification.service';

const prisma = new PrismaClient();
const MAX_FAVORITES = 100;

export const toggleFavorite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { targetId } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    if (!targetId) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'targetId is required' } });

    const existing = await prisma.favorite.findUnique({
      where: {
        user_id_target_id: {
          user_id: userId,
          target_id: targetId
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return res.status(200).json({ success: true, data: { action: 'removed' } });
    }

    const currentCount = await prisma.favorite.count({ where: { user_id: userId } });
    if (currentCount >= MAX_FAVORITES) {
      return res.status(400).json({ success: false, error: { code: 'LIMIT_REACHED', message: `You can only have up to ${MAX_FAVORITES} favorites.` } });
    }

    await prisma.favorite.create({
      data: {
        user_id: userId,
        target_id: targetId
      }
    });

    // Send push notification to target
    await sendPushNotification(targetId, 'New Favorite! 🌟', 'Someone just added you to their favorites!', { type: 'FAVORITE' });

    return res.status(200).json({ success: true, data: { action: 'added' } });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getFavorites = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const favorites = await prisma.favorite.findMany({
      where: { user_id: userId },
      include: {
        target: {
          select: {
            id: true,
            first_name: true,
            job_title: true,
            photos: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({ success: true, data: { favorites } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
