import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API', () => {
  describe('POST /api/v1/auth/google', () => {
    it('should create a new user and return JWT tokens for valid firebase token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'valid_test_token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.status).toBe('UNDER_REVIEW');
      
      const dbUser = await prisma.user.findUnique({
        where: { firebase_uid: 'valid_test_token' }
      });
      expect(dbUser).not.toBeNull();
    });

    it('should fail with 401 for invalid firebase token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return existing user on subsequent logins', async () => {
      await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'existing_token' });

      const response2 = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'existing_token' });

      expect(response2.status).toBe(200);
      expect(response2.body.data.user).toHaveProperty('id');

      const count = await prisma.user.count({
        where: { firebase_uid: 'existing_token' }
      });
      expect(count).toBe(1);
    });
  });
});
