import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let adminToken: string;
let targetUserId: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'admin_user' });
  adminToken = authRes.body.data.accessToken;

  // Since we don't have role=ADMIN yet, we just bypass it by testing the logic
  // Assume the user is an admin for this test or the endpoints don't strictly check roles yet

  const targetRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'target_user' });
  targetUserId = targetRes.body.data.user.id;
});

describe('Admin API', () => {
  it('should list users with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThan(0);
    expect(res.body.data.meta.page).toBe(1);
  });

  it('should approve a user', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${targetUserId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('APPROVED');
  });

  it('should reject a user with a valid reason', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${targetUserId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'INAPPROPRIATE_PHOTO', remark: 'Bad photo' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('REJECTED');
  });

  it('should fail rejection with invalid reason', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${targetUserId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'IDK', remark: 'Just because' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
