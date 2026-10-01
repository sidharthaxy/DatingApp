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

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return the session user', async () => {
      const login = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'refresh_user' });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.id).toBe(login.body.data.user.id);
      expect(res.body.data.user.has_kyc).toBe(false);
      expect(res.body.data.user.is_profile_complete).toBe(false);
    });

    it('should reject a garbage refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'not-a-token' });

      expect(res.status).toBe(401);
    });
  });
});
