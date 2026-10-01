import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

/**
 * Object storage (MinIO locally, S3 / R2 in production).
 *
 * Two endpoints matter:
 *  - STORAGE_ENDPOINT     how THIS server reaches storage (e.g. http://127.0.0.1:9000)
 *  - STORAGE_PUBLIC_URL   how CLIENTS reach the same S3 API (LAN IP locally; used for
 *                         presigned URLs and, unless MEDIA_BASE_URL is set, media links)
 *
 * They are the same on a single laptop, but a phone on Wi-Fi cannot open 127.0.0.1, so any
 * URL handed to a client (photo URLs, presigned URLs) must be built from the public one.
 */
const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const STORAGE_ENDPOINT = stripTrailingSlash(process.env.STORAGE_ENDPOINT || 'http://127.0.0.1:9000');
export const STORAGE_PUBLIC_URL = stripTrailingSlash(process.env.STORAGE_PUBLIC_URL || STORAGE_ENDPOINT);
export const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'minglex-media';

const baseConfig = {
  region: process.env.STORAGE_REGION || 'us-east-1',
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
  },
};

/** Client used for server-side reads/writes. */
export const s3 = new S3Client({ ...baseConfig, endpoint: STORAGE_ENDPOINT });

/**
 * Client used ONLY to presign URLs. SigV4 signs the Host header, so a URL presigned against
 * the internal endpoint cannot simply have its host swapped afterwards.
 */
const s3Public = new S3Client({ ...baseConfig, endpoint: STORAGE_PUBLIC_URL });

/**
 * Optional CDN / public-bucket base for plain media URLs, used as `<MEDIA_BASE_URL>/<key>`
 * (e.g. an R2 public bucket `https://pub-xxxx.r2.dev` or `https://media.minglex.com`).
 * Without it, media is addressed path-style through the storage endpoint itself.
 */
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL ? stripTrailingSlash(process.env.MEDIA_BASE_URL) : null;

export const publicUrlFor = (key: string) =>
  MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/${key}` : `${STORAGE_PUBLIC_URL}/${BUCKET_NAME}/${key}`;

export const putObject = async (key: string, body: Buffer, contentType: string) => {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: body, ContentType: contentType }));
  return key;
};

export const signUploadUrl = (key: string, contentType: string, expiresIn = 3600) =>
  getSignedUrl(s3Public, new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType }), { expiresIn });

export const signReadUrl = (key: string, expiresIn = 3600) =>
  getSignedUrl(s3Public, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), { expiresIn });

/** `video/webm;codecs=vp9,opus` -> `video/webm` */
export const baseMimeType = (contentType: string | undefined | null) =>
  (contentType || '').split(';')[0].trim().toLowerCase();

const EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/3gpp': '3gp',
  'audio/x-caf': 'caf',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  m4a: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', caf: 'audio/x-caf',
};

/**
 * The content type of an uploaded multipart file.
 *
 * Browsers label MediaRecorder output as e.g. `video/webm;codecs=vp8,opus`. The unquoted comma
 * is not a valid MIME parameter, so the multipart parser gives up and reports `text/plain`;
 * some Android pickers send `application/octet-stream`. In those cases fall back to the
 * file extension (as client-controlled as the header itself, so nothing is lost).
 */
export const uploadedMimeType = (file: { mimetype?: string; originalname?: string }, allowed: string[]) => {
  const declared = baseMimeType(file.mimetype);
  if (allowed.includes(declared)) return declared;
  const ext = (file.originalname || '').split('.').pop()?.toLowerCase() || '';
  const inferred = MIME_BY_EXTENSION[ext];
  // An audio-only webm/mp4 upload shares its extension with the video container.
  if (inferred && !allowed.includes(inferred)) {
    const audioTwin = inferred.replace(/^video\//, 'audio/');
    if (allowed.includes(audioTwin)) return audioTwin;
  }
  return inferred && allowed.includes(inferred) ? inferred : declared;
};

export const extensionFor = (contentType: string, fallback = 'bin') => EXTENSIONS[baseMimeType(contentType)] || fallback;

/** Collision-free, path-traversal-free object name. Client filenames are never trusted. */
export const uniqueName = (contentType: string, fallbackExt = 'bin') =>
  `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${extensionFor(contentType, fallbackExt)}`;
