import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const prisma = new PrismaClient();

// Configure R2 Client (S3 API Compatible)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'minglex-media';

export const getSignedUploadUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { filename, contentType, type } = req.body; // type: 'photo' | 'kyc' | 'chat'

    if (!filename || !contentType || !type) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing parameters' } });
    }

    let key = '';
    if (type === 'kyc') {
      key = `users/${userId}/kyc/${filename}`;
    } else if (type === 'photo') {
      // Basic version logic (can be extended)
      const version = Date.now();
      key = `users/${userId}/photos/v${version}_${filename}`;
    } else if (type === 'chat') {
      key = `chats/${userId}/${Date.now()}_${filename}`;
    } else {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid media type' } });
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiration

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl: signedUrl,
        key: key
      }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const generateSignedReadUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Key required' } });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.status(200).json({
      success: true,
      data: { url: signedUrl }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
