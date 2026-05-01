import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { blacklistToken } from '../config/redis';
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || 'refresh_secret';

const generateTokens = (user: any) => {
  const accessToken = jwt.sign({ id: user.id, status: user.status }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

import admin from '../config/firebase';

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'idToken required' } });
    }

    // Verify `idToken` using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'No email found in token' } });
    }

    let user = await prisma.user.findUnique({ where: { firebase_uid: uid } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebase_uid: uid,
          email,
          status: 'UNDER_REVIEW',
          last_login_at: new Date(),
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });
    }

    const tokens = generateTokens(user);
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          status: user.status,
          is_profile_complete: user.is_profile_complete,
        }
      }
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: error.message || 'Invalid token' } });
  }
};

export const verifyFirebaseToken = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'idToken required' } });
    }

    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    const uid = decodedToken.uid;
    const phone = decodedToken.phone_number;
    const email = decodedToken.email;

    let user = await prisma.user.findUnique({ where: { firebase_uid: uid } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebase_uid: uid,
          phone: phone || null,
          email: email || null,
          status: 'UNDER_REVIEW',
          last_login_at: new Date(),
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });
    }

    if (!user) {
      return res.status(400).json({ success: false, error: { code: 'USER_CREATION_FAILED', message: 'Failed to create user' } });
    }

    const tokens = generateTokens(user);
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          status: user.status,
          is_profile_complete: user.is_profile_complete,
        }
      }
    });

  } catch (error: any) {
    console.error('[verifyFirebaseToken Error]', error);
    return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: error.message || 'Invalid token' } });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token) as any;
    
    if (decoded && decoded.exp) {
      // Calculate remaining time until token expiration
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const expiresInSeconds = Math.floor((expirationTime - currentTime) / 1000);
      
      if (expiresInSeconds > 0) {
        await blacklistToken(token, expiresInSeconds);
      }
    }
    
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'refreshToken required' } });
    }

    const decoded = jwt.verify(token, REFRESH_JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'User not found' } });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'User is blocked' } });
    }

    const tokens = generateTokens(user);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    });

  } catch (error: any) {
    return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid or expired refresh token' } });
  }
};
