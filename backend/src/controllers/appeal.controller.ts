import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const submitAppeal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reason } = req.body;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    if (!reason) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Reason is required' } });

    // Check if user is actually banned or hidden
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    if (user.status !== 'REJECTED' && user.discover_enabled) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Your account is active and does not require an appeal' } });
    }

    // Check for pending appeals
    const existingAppeal = await prisma.appeal.findFirst({
      where: { user_id: userId, status: 'PENDING' }
    });

    if (existingAppeal) {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_PENDING', message: 'You already have a pending appeal' } });
    }

    const appeal = await prisma.appeal.create({
      data: {
        user_id: userId,
        reason
      }
    });

    return res.status(201).json({ success: true, data: { appeal } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getAppeals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as any; // PENDING, APPROVED, REJECTED
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const whereClause = statusFilter ? { status: statusFilter } : {};
    const skip = (page - 1) * limit;

    const appeals = await prisma.appeal.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, first_name: true, status: true, discover_enabled: true, report_count: true } }
      },
      orderBy: { created_at: 'asc' }, // Oldest first
      skip,
      take: limit
    });

    return res.status(200).json({ success: true, data: { appeals } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const resolveAppeal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { appealId } = req.params;
    const { action } = req.body; // 'APPROVE', 'REJECT'

    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    await prisma.$transaction(async (tx) => {
      if (action === 'APPROVE') {
        // Restore account
        await tx.user.update({
          where: { id: appeal.user_id },
          data: { status: 'APPROVED', discover_enabled: true, report_count: 0 } // Reset report count on successful appeal
        });
        await tx.appeal.update({ where: { id: appealId }, data: { status: 'APPROVED' } });
      } else if (action === 'REJECT') {
        await tx.appeal.update({ where: { id: appealId }, data: { status: 'REJECTED' } });
      } else {
        throw new Error('Invalid action');
      }
    });

    return res.status(200).json({ success: true, data: { message: `Appeal ${action.toLowerCase()}d successfully` } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
