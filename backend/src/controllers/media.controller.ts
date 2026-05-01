import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { checkAndMarkProfileComplete } from './user.controller';

const prisma = new PrismaClient();

// Configure MinIO Client (S3 API Compatible)
const s3 = new S3Client({
  region: process.env.STORAGE_REGION || 'us-east-1',
  endpoint: process.env.STORAGE_ENDPOINT || 'http://127.0.0.1:9000',
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
  },
});

const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'minglex-media';

export const getSignedUploadUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { filename, contentType, type, fileSize } = req.body; // type: 'photo' | 'kyc' | 'chat'

    if (!filename || !contentType || !type || !fileSize) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing parameters including fileSize' } });
    }

    // Validation
    const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_KYC_SIZE = 20 * 1024 * 1024; // 20MB
    const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const ALLOWED_KYC_TYPES = ['video/mp4', 'video/quicktime'];

    if (type === 'photo') {
      if (fileSize > MAX_PHOTO_SIZE) return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Photo must be under 5MB' } });
      if (!ALLOWED_PHOTO_TYPES.includes(contentType)) return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, WEBP allowed for photos' } });
    } else if (type === 'kyc') {
      if (fileSize > MAX_KYC_SIZE) return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'KYC Video must be under 20MB' } });
      if (!ALLOWED_KYC_TYPES.includes(contentType)) return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only MP4, MOV allowed for KYC' } });
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

export const confirmPhotoUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'URL required' } });

    const photoCount = await prisma.photo.count({ where: { user_id: userId } });
    if (photoCount >= 9) {
      return res.status(400).json({ success: false, error: { code: 'MAX_PHOTOS', message: 'Maximum 9 photos allowed' } });
    }

    const photo = await prisma.photo.create({
      data: {
        user_id: userId as string,
        url,
        status: 'UNDER_REVIEW'
      }
    });

    await checkAndMarkProfileComplete(userId as string);

    return res.status(200).json({ success: true, data: photo });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const confirmKycUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'URL required' } });

    await prisma.user.update({
      where: { id: userId },
      data: { 
        kyc_video_url: url,
        status: 'UNDER_REVIEW'
      }
    });

    return res.status(200).json({ success: true, message: 'KYC submitted for review' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
