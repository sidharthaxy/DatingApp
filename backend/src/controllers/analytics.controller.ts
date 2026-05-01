import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const recordProfileView = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'User ID required' } });
    }

    // Increment profile views
    await prisma.user.update({
      where: { id: userId },
      data: { profile_views: { increment: 1 } }
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getMyStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile_views: true }
    });

    const likesReceived = await prisma.swipe.count({
      where: { to_user: userId, type: 'LIKE' }
    });

    const dislikesReceived = await prisma.swipe.count({
      where: { to_user: userId, type: 'DISLIKE' }
    });

    return res.status(200).json({
      success: true,
      data: {
        profile_views: user?.profile_views || 0,
        likes_received: likesReceived,
        dislikes_received: dislikesReceived
      }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
