import { Response } from 'express';
import { PrismaClient, ReportReason } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const DAILY_REPORT_LIMIT = 5;
const AUTO_HIDE_THRESHOLD = 10;

export const submitReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reporterId = req.user?.id;
    const { targetId } = req.params;
    const { reason, evidence } = req.body;

    if (!reporterId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    if (!targetId || !reason) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'targetId and reason are required' } });
    }

    if (!Object.values(ReportReason).includes(reason)) {
       return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid reason' } });
    }

    // Check rate limit: 5 reports per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportsToday = await prisma.report.count({
      where: {
        reporter_id: reporterId,
        created_at: { gte: today }
      }
    });

    if (reportsToday >= DAILY_REPORT_LIMIT) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Daily report limit reached' } });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Report
      await tx.report.create({
        data: {
          reporter_id: reporterId,
          reported_id: targetId,
          reason,
          evidence
        }
      });

      // 2. Increment Target's report_count
      const targetUser = await tx.user.update({
        where: { id: targetId },
        data: { report_count: { increment: 1 } },
        select: { report_count: true, discover_enabled: true }
      });

      // 3. Auto-hide if threshold reached
      if (targetUser.report_count >= AUTO_HIDE_THRESHOLD && targetUser.discover_enabled) {
        await tx.user.update({
          where: { id: targetId },
          data: { discover_enabled: false }
        });
      }
    });

    return res.status(201).json({ success: true, data: { message: 'Report submitted successfully' } });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
