import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { sendPushNotification } from '../services/notification.service';
import admin from '../config/firebase';

const prisma = new PrismaClient();
let authToken: string;
let userId: string;

beforeAll(() => {
  // Mock Firebase Messaging
  admin.messaging = jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue('messages/mock-id'),
  });
});

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'notification_test_user' });
  
  authToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;
});

describe('Notification API', () => {
  it('should save FCM token to database', async () => {
    const res = await request(app)
      .post('/api/v1/users/fcm-token')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ fcm_token: 'test_token_123456789' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.fcm_token).toBe('test_token_123456789');
  });

  it('should successfully call admin.messaging when triggered', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { fcm_token: 'valid_mock_token' }
    });

    const success = await sendPushNotification(userId, 'Test', 'Body', { type: 'TEST' });
    expect(success).toBe(true);
    expect(admin.messaging().send).toHaveBeenCalled();
  });
});
