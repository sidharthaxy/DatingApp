import { Response, Request } from 'express';
import { PrismaClient, Status, AdminActionType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Middleware to check if user is admin would ideally go here.
// For now, we assume standard auth wraps this and role checks are mocked.

export const getUsers = async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as Status;
    
    const whereClause = statusFilter ? { status: statusFilter } : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        photos: true
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({ success: true, data: { users } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        photos: true,
        admin_actions: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' }});
    }

    return res.status(200).json({ success: true, data: { user } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const approveUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin-system';

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    await prisma.adminAction.create({
      data: {
        user_id: id,
        action: 'APPROVE',
        reason: 'Manually approved by admin',
      }
    });

    return res.status(200).json({ success: true, data: { user } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const rejectUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, remark } = req.body;
    const adminId = req.user?.id || 'admin-system';

    if (!reason || !remark) {
       return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Reason and remark are required' }});
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    await prisma.adminAction.create({
      data: {
        user_id: id,
        action: 'REJECT',
        reason: reason,
        remark: remark
      }
    });

    return res.status(200).json({ success: true, data: { user } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
