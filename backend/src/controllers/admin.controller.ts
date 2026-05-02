import { Response, Request } from 'express';
import { PrismaClient, Status, AdminActionType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendPushNotification } from '../services/notification.service';

export enum RejectionReason {
  INAPPROPRIATE_PHOTO = 'INAPPROPRIATE_PHOTO',
  INCOMPLETE_KYC = 'INCOMPLETE_KYC',
  FAKE_PROFILE = 'FAKE_PROFILE',
  UNDERAGE = 'UNDERAGE',
  OTHER = 'OTHER'
}

const prisma = new PrismaClient();

// Middleware to check if user is admin would ideally go here.
// For now, we assume standard auth wraps this and role checks are mocked.

export const getUsers = async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as Status;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const whereClause = statusFilter ? { status: statusFilter } : {};
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        photos: true
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.user.count({ where: whereClause });

    return res.status(200).json({ success: true, data: { users, meta: { total, page, limit } } });
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

    await sendPushNotification(id, 'Profile Approved!', 'Your profile has been approved. Start swiping!', { type: 'KYC_APPROVED' });

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

    if (!Object.values(RejectionReason).includes(reason)) {
       return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid rejection reason' }});
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

    await sendPushNotification(id, 'Profile Update Required', `Your profile was rejected: ${remark}`, { type: 'KYC_REJECTED' });

    return res.status(200).json({ success: true, data: { user } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as any; // PENDING, RESOLVED, DISMISSED
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const whereClause = statusFilter ? { status: statusFilter } : {};
    const skip = (page - 1) * limit;

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        reporter: { select: { id: true, first_name: true } },
        reported: { select: { id: true, first_name: true, report_count: true, status: true } }
      },
      orderBy: [
        { reported: { report_count: 'desc' } }, // Sort by most reported target first
        { created_at: 'desc' }
      ],
      skip,
      take: limit
    });

    return res.status(200).json({ success: true, data: { reports } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const resolveReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action, remark } = req.body; // 'BAN', 'WARN', 'DISMISS'

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    await prisma.$transaction(async (tx) => {
      if (action === 'BAN') {
        await tx.user.update({
          where: { id: report.reported_id },
          data: { status: 'REJECTED', discover_enabled: false }
        });
        await tx.report.update({ where: { id: reportId }, data: { status: 'RESOLVED' } });
        await tx.adminAction.create({
          data: {
            user_id: report.reported_id,
            action: 'BAN',
            reason: report.reason,
            remark
          }
        });
      } else if (action === 'WARN') {
        await tx.report.update({ where: { id: reportId }, data: { status: 'RESOLVED' } });
        await tx.adminAction.create({
          data: {
            user_id: report.reported_id,
            action: 'WARN',
            reason: report.reason,
            remark
          }
        });
      } else if (action === 'DISMISS') {
        await tx.report.update({ where: { id: reportId }, data: { status: 'DISMISSED' } });
      } else {
        throw new Error('Invalid action');
      }
    });

    return res.status(200).json({ success: true, data: { message: `Report ${action.toLowerCase()}ed successfully` } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
