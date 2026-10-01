import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { checkAndMarkProfileComplete } from './user.controller';
import {
  baseMimeType,
  publicUrlFor,
  putObject,
  signReadUrl,
  signUploadUrl,
  uniqueName,
  uploadedMimeType,
} from '../config/storage';
import multer from 'multer';
import sharp from 'sharp';

const prisma = new PrismaClient();

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_KYC_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_CHAT_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// video/webm is what browsers (MediaRecorder) produce; mp4/quicktime come from iOS/Android.
const ALLOWED_KYC_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_CHAT_TYPES = [
  ...ALLOWED_PHOTO_TYPES,
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/3gpp', 'audio/x-caf',
];

const kycPrefix = (userId: string) => `users/${userId}/kyc/`;

/**
 * Records a submitted KYC video. A banned (REJECTED) account stays banned — re-uploading a
 * video must not be a way around moderation; the appeal flow is.
 */
const saveKycSubmission = async (userId: string, key: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  return prisma.user.update({
    where: { id: userId },
    data: {
      kyc_video_url: key,
      ...(user?.status === 'REJECTED' ? {} : { status: 'UNDER_REVIEW' as const }),
    },
  });
};

export const getSignedUploadUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { filename, type, fileSize } = req.body; // type: 'photo' | 'kyc' | 'chat'
    const contentType = baseMimeType(req.body.contentType);

    if (!filename || !contentType || !type || !fileSize) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing parameters including fileSize' } });
    }

    let key = '';
    if (type === 'photo') {
      if (fileSize > MAX_PHOTO_SIZE) return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Photo must be under 5MB' } });
      if (!ALLOWED_PHOTO_TYPES.includes(contentType)) return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, WEBP allowed for photos' } });
      key = `users/${userId}/photos/v${uniqueName(contentType, 'jpg')}`;
    } else if (type === 'kyc') {
      if (fileSize > MAX_KYC_SIZE) return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'KYC video must be under 25MB' } });
      if (!ALLOWED_KYC_TYPES.includes(contentType)) return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only MP4, MOV, WEBM or standard images allowed for KYC' } });
      key = `${kycPrefix(userId as string)}${uniqueName(contentType, 'mp4')}`;
    } else if (type === 'chat') {
      if (fileSize > MAX_CHAT_SIZE) return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Chat media must be under 10MB' } });
      if (!ALLOWED_CHAT_TYPES.includes(contentType)) return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Unsupported chat media type' } });
      key = `chats/${userId}/${uniqueName(contentType)}`;
    } else {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid media type' } });
    }

    const signedUrl = await signUploadUrl(key, contentType); // 1 hour expiration

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl: signedUrl,
        key,
        contentType, // the exact Content-Type the client must send on the PUT
      }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const generateSignedReadUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { key } = req.body;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Key required' } });
    }

    // KYC videos are identity documents: only their owner may read them here
    // (admins get their own signed URL from the admin API).
    const isKyc = /^users\/[^/]+\/kyc\//.test(key);
    if (key.includes('..') || (isKyc && !key.startsWith(kycPrefix(userId as string)))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot access this file' } });
    }

    const signedUrl = await signReadUrl(key);

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

/** Confirms a KYC video that was PUT straight to storage with a presigned URL. */
export const confirmKycUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const { url } = req.body;
    if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'URL required' } });

    // Must be a key this user was issued by /upload-url — never an arbitrary string or
    // another member's video.
    if (!url.startsWith(kycPrefix(userId)) || url.includes('..')) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Unknown KYC upload key' } });
    }

    const user = await saveKycSubmission(userId, url);

    return res.status(200).json({ success: true, data: { message: 'KYC submitted for review', status: user.status, has_kyc: true } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// ─── Multipart uploads (proxied through the API) ─────────────────────────────────────────────
// Browsers and phones only ever need to reach the API host, so these work regardless of
// where object storage lives.

const multipart = (field: string, maxSize: number, allowed: string[], label: string) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      const mimetype = uploadedMimeType(file, allowed);
      if (allowed.includes(mimetype)) {
        file.mimetype = mimetype; // normalised for the handlers below
        cb(null, true);
      } else {
        cb(new Error(`Unsupported ${label} type: ${file.mimetype}`));
      }
    },
  }).single(field);

  // Multer reports problems through next(err); turn them into the API's JSON error shape.
  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: any) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: `${label} must be under ${Math.round(maxSize / (1024 * 1024))}MB` } });
      }
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: err.message || `Invalid ${label}` } });
    });
  };
};

export const uploadPhotoMiddleware = multipart('photo', MAX_PHOTO_SIZE, ALLOWED_PHOTO_TYPES, 'Photo');
export const uploadKycMiddleware = multipart('video', MAX_KYC_SIZE, ALLOWED_KYC_TYPES, 'KYC video');
export const uploadChatMediaMiddleware = multipart('file', MAX_CHAT_SIZE, ALLOWED_CHAT_TYPES, 'Chat media');

export const uploadPhoto = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No photo provided or invalid type' } });
    }

    const photoCount = await prisma.photo.count({ where: { user_id: userId } });
    if (photoCount >= 9) {
      return res.status(400).json({ success: false, error: { code: 'MAX_PHOTOS', message: 'Maximum 9 photos allowed' } });
    }

    // Process with sharp (.rotate() applies EXIF orientation so phone photos are upright)
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'That file is not a readable image' } });
    }

    const version = Date.now();
    const key = `users/${userId}/photos/v${version}_optimized.webp`;

    // Upload to S3/MinIO
    await putObject(key, optimizedBuffer, 'image/webp');

    // Save to DB
    const photo = await prisma.photo.create({
      data: {
        user_id: userId,
        url: publicUrlFor(key),
        status: 'UNDER_REVIEW',
      }
    });

    const isProfileComplete = await checkAndMarkProfileComplete(userId);

    return res.status(201).json({ success: true, data: { photo, is_profile_complete: isProfileComplete } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: storageErrorMessage(error) } });
  }
};

/** POST /media/kyc — multipart field `video`. Stores the clip and submits it for review. */
export const uploadKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    if (!req.file || req.file.size === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No KYC video provided' } });
    }

    const contentType = baseMimeType(req.file.mimetype);
    const key = `${kycPrefix(userId)}${uniqueName(contentType, 'mp4')}`;
    await putObject(key, req.file.buffer, contentType);

    const user = await saveKycSubmission(userId, key);

    return res.status(201).json({
      success: true,
      data: { message: 'KYC submitted for review', status: user.status, has_kyc: true },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: storageErrorMessage(error) } });
  }
};

/** POST /media/chat-upload — multipart field `file`. Returns a URL usable as a message's media_url. */
export const uploadChatMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    if (!req.file || req.file.size === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No file provided' } });
    }

    const contentType = baseMimeType(req.file.mimetype);
    const key = `chats/${userId}/${uniqueName(contentType)}`;
    await putObject(key, req.file.buffer, contentType);

    return res.status(201).json({ success: true, data: { key, url: publicUrlFor(key), contentType } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: storageErrorMessage(error) } });
  }
};

/** A refused connection to MinIO otherwise reads as a baffling "connect ECONNREFUSED". */
const storageErrorMessage = (error: any) => {
  const text = `${error?.code || ''} ${error?.name || ''} ${error?.message || ''}`;
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|TimeoutError/.test(text)) {
    return 'Media storage is unreachable. Is MinIO / S3 running and STORAGE_ENDPOINT correct?';
  }
  if (/NoSuchBucket/.test(text)) {
    return 'Media storage bucket does not exist. Run "npm run storage:init" in backend/.';
  }
  return error?.message || 'Upload failed';
};
