import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'idToken required' } });
    }

    // In a real app, verify `idToken` using Firebase Admin SDK
    // For now, we mock the extracted email/phone
    const mockEmail = 'user@example.com';
    const mockUid = 'firebase_uid_123';

    let user = await prisma.user.findUnique({ where: { email: mockEmail } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: mockEmail,
          status: 'UNDER_REVIEW',
        }
      });
    }

    const accessToken = jwt.sign({ id: user.id, status: user.status }, JWT_SECRET, { expiresIn: '7d' });
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: 'mock-refresh-token',
        user: {
          id: user.id,
          status: user.status
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'AUTH_FAILED', message: error.message } });
  }
};

export const phoneLogin = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Phone and OTP required' } });
    }

    // Mock verification
    if (otp !== '123456') {
      return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid OTP' } });
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          status: 'UNDER_REVIEW',
        }
      });
    }

    const accessToken = jwt.sign({ id: user.id, status: user.status }, JWT_SECRET, { expiresIn: '7d' });
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: 'mock-refresh-token',
        user: {
          id: user.id,
          status: user.status
        }
      }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'AUTH_FAILED', message: error.message } });
  }
};
