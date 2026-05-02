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
