import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;

beforeEach(async () => {
  // Create a user and get token
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'user_test_token' });
  
  authToken = authRes.body.data.accessToken;
});

describe('User API', () => {
  describe('GET /api/v1/users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firebase_uid).toBe('user_test_token');
    });

    it('should fail if no token provided', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update user info and validate age >= 18', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 20); // 20 years old

      const res = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'John',
          gender: 'MALE',
          dob: dob.toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify DB
      const user = await prisma.user.findUnique({ where: { firebase_uid: 'user_test_token' }});
      expect(user?.first_name).toBe('John');
      expect(user?.gender).toBe('MALE');
    });

    it('should reject users under 18', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 17); // 17 years old

      const res = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Timmy',
          dob: dob.toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AGE_RESTRICTION');
    });
  });

  describe('POST /api/v1/users/location', () => {
    it('should validate coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/users/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ latitude: 200, longitude: 200 }); // Invalid

      expect(res.status).toBe(400);
    });

    it('should update valid coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/users/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ latitude: 45.0, longitude: -90.0 }); 

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const user = await prisma.user.findUnique({ where: { firebase_uid: 'user_test_token' }});
      expect(user?.latitude).toBe(45.0);
      expect(user?.longitude).toBe(-90.0);
    });
  });
});
