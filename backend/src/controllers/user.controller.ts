import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { first_name, bio, height_cm, job_title, company, living_in } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { first_name, bio, height_cm, job_title, company, living_in }
    });

    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateLocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Lat/Lng required' } });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { latitude, longitude }
    });

    return res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updatePreferences = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { interested_in, relationship_goal } = req.body;

    await prisma.user.update({
      where: { id: userId },
      data: { interested_in, relationship_goal }
    });

    return res.status(200).json({ success: true, message: 'Preferences updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const toggleDiscover = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Enabled boolean required' } });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { discover_enabled: enabled }
    });

    return res.status(200).json({ success: true, message: 'Discover toggled' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
