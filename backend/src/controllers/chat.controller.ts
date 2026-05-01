import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Helper to verify match
const verifyMatch = async (userId: string, partnerId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { user1_id: userId, user2_id: partnerId },
        { user1_id: partnerId, user2_id: userId }
      ]
    }
  });

  if (!match) return false;

  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (partner?.status === 'REJECTED') return false;

  return true;
};

export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' }});

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, first_name: true, photos: true, status: true } },
        user2: { select: { id: true, first_name: true, photos: true, status: true } }
      }
    });

    const conversations = [];

    for (const match of matches) {
      const partner = match.user1.id === userId ? match.user2 : match.user1;
      
      if (partner.status === 'REJECTED') continue;

      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { from_user: userId, to_user: partner.id },
            { from_user: partner.id, to_user: userId }
          ]
        },
        orderBy: { created_at: 'desc' }
      });

      conversations.push({
        match_id: match.id,
        partner,
        lastMessage
      });
    }

    // Sort conversations by latest message first, or match creation time if no messages
    conversations.sort((a, b) => {
      const timeAVal = a.lastMessage?.created_at.getTime() || 0;
      const timeBVal = b.lastMessage?.created_at.getTime() || 0;
      return timeBVal - timeAVal;
    });

    const paginatedConversations = conversations.slice(skip, skip + limit);

    return res.status(200).json({ success: true, data: { conversations: paginatedConversations, meta: { total: conversations.length, page, limit } } });
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

    const isMatch = await verifyMatch(userId, partnerId);
    if (!isMatch) {
      return res.status(403).json({ success: false, error: { code: 'NOT_MATCHED', message: 'You can only chat with active matches' }});
    }

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

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { partnerId, content } = req.body;

    if (!userId || !partnerId || !content) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'partnerId and content are required' }});
    }

    const isMatch = await verifyMatch(userId, partnerId);
    if (!isMatch) {
      return res.status(403).json({ success: false, error: { code: 'NOT_MATCHED', message: 'You can only chat with active matches' }});
    }

    const message = await prisma.message.create({
      data: {
        from_user: userId,
        to_user: partnerId,
        content
      }
    });

    return res.status(200).json({ success: true, data: { message } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
