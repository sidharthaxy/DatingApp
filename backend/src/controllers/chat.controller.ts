import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' }});

    // In a full implementation, you'd find all unique users the current user has exchanged messages with
    // and sort by latest message created_at.
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { from_user: userId },
          { to_user: userId }
        ]
      },
      orderBy: { created_at: 'desc' },
      distinct: ['from_user', 'to_user']
    });

    return res.status(200).json({ success: true, data: { conversations: messages } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { partnerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!userId || !partnerId) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' }});

    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { from_user: userId, to_user: partnerId },
          { from_user: partnerId, to_user: userId }
        ]
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    return res.status(200).json({ success: true, data: { messages } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
