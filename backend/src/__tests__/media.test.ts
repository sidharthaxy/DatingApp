import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;
let userId: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'media_test_user' });
  authToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;
});

// Mock S3
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({})
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn()
  };
});

describe('Media Upload via Multer & Sharp', () => {
  it('should process and upload a valid image', async () => {
    // 1x1 pixel PNG
    const dummyImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('photo', dummyImage, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.photo.url).toContain('.webp');
    expect(res.body.data.photo.user_id).toBe(userId);
  });

  it('should reject invalid file types', async () => {
    const dummyText = Buffer.from('this is not an image');

    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('photo', dummyText, { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).not.toBe(201);
  });
});

describe('KYC video upload', () => {
  it('should store a browser-recorded webm and submit it for review', async () => {
    const res = await request(app)
      .post('/api/v1/media/kyc')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('video', Buffer.from('fake-webm-bytes'), { filename: 'kyc.webm', contentType: 'video/webm;codecs=vp8,opus' });

    expect(res.status).toBe(201);
    expect(res.body.data.has_kyc).toBe(true);
    expect(res.body.data.status).toBe('UNDER_REVIEW');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.kyc_video_url).toMatch(new RegExp(`^users/${userId}/kyc/.+\\.webm$`));
  });

  it('should reject a non-video KYC upload', async () => {
    const res = await request(app)
      .post('/api/v1/media/kyc')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('video', Buffer.from('nope'), { filename: 'kyc.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TYPE');
  });

  it('should not lift a ban when a rejected user re-uploads KYC', async () => {
    await prisma.user.update({ where: { id: userId }, data: { status: 'REJECTED' } });

    const res = await request(app)
      .post('/api/v1/media/kyc')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('video', Buffer.from('fake-mp4-bytes'), { filename: 'kyc.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.status).toBe('REJECTED');
  });

  it('should only confirm a KYC key that belongs to the caller', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload-kyc')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ url: 'users/someone-else/kyc/video.mp4' });

    expect(res.status).toBe(400);
  });

  it("should refuse to sign a read URL for another member's KYC video", async () => {
    const res = await request(app)
      .post('/api/v1/media/signed-url')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ key: 'users/someone-else/kyc/video.mp4' });

    expect(res.status).toBe(403);
  });
});

describe('Chat media upload', () => {
  it('should store a voice note and return its URL', async () => {
    const res = await request(app)
      .post('/api/v1/media/chat-upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('fake-audio'), { filename: 'voice.m4a', contentType: 'audio/m4a' });

    expect(res.status).toBe(201);
    expect(res.body.data.url).toContain(`chats/${userId}/`);
  });
});
