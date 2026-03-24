import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getDiscoveryFeed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Advanced PostGIS logic would go here
    // For now, simple mock pagination of users
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        NOT: { id: userId },
        status: 'APPROVED',
        discover_enabled: true
      },
      skip,
      take: limit,
      include: { photos: true }
    });

    return res.status(200).json({
      success: true,
      data: { users }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
