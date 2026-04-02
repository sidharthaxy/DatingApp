import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isTokenBlacklisted } from '../config/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    status: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Unauthorized' } });
  }

  const token = authHeader.split(' ')[1];

  try {
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ success: false, error: { code: 'TOKEN_BLACKLISTED', message: 'Token has been logged out' } });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      status: decoded.status,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token invalid or expired' } });
  }
};
