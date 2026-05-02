import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateDiscoveryCache } from '../config/redis';

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
    const { first_name, bio, height_cm, job_title, company, living_in, dob, gender } = req.body;

    if (dob) {
      const birthDate = new Date(dob);
      const ageDifMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (age < 18) {
        return res.status(400).json({ success: false, error: { code: 'AGE_RESTRICTION', message: 'You must be at least 18 years old' } });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        first_name, bio, height_cm, job_title, company, living_in, gender,
        ...(dob && { dob: new Date(dob) })
      }
    });

    await checkAndMarkProfileComplete(userId as string);

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

    await invalidateDiscoveryCache(userId as string);

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

export const checkAndMarkProfileComplete = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      photos: true,
      user_interests: true
    }
  });

  if (!user) return false;

  const hasName = !!user.first_name;
  const hasDob = !!user.dob;
  const hasPhoto = user.photos.length > 0;
  const hasInterests = user.user_interests.length > 0;

  const isComplete = hasName && hasDob && hasPhoto && hasInterests;

  if (isComplete !== user.is_profile_complete) {
    await prisma.user.update({
      where: { id: userId },
      data: { is_profile_complete: isComplete }
    });
  }

  return isComplete;
};

export const updateInterests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { interest_ids } = req.body;

    if (!Array.isArray(interest_ids)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'interest_ids must be an array' } });
    }

    await prisma.userInterest.deleteMany({
      where: { user_id: userId }
    });

    if (interest_ids.length > 0) {
      await prisma.userInterest.createMany({
        data: interest_ids.map((id: string) => ({
          user_id: userId as string,
          interest_id: id
        }))
      });
    }

    await checkAndMarkProfileComplete(userId as string);

    return res.status(200).json({ success: true, message: 'Interests updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateFcmToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { fcm_token } = req.body;

    await prisma.user.update({
      where: { id: userId },
      data: { fcm_token }
    });

    return res.status(200).json({ success: true, message: 'FCM Token updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const boostUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    // Mock Razorpay successful boost logic
    // Grant 30 minutes of boost
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { boost_expires_at: expiresAt }
    });

    return res.status(200).json({ success: true, message: 'Boost activated', data: { expires_at: expiresAt } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getInterests = async (req: Request, res: Response) => {
  try {
    const interests = await prisma.interest.findMany();
    return res.status(200).json({ success: true, data: interests });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
