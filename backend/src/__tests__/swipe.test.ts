import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken1: string;
let authToken2: string;
let user1Id: string;
let user2Id: string;

beforeEach(async () => {
  const authRes1 = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'swiper_1' });
  authToken1 = authRes1.body.data.accessToken;
  user1Id = authRes1.body.data.user.id;

  const authRes2 = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'swiper_2' });
  authToken2 = authRes2.body.data.accessToken;
  user2Id = authRes2.body.data.user.id;
});

describe('Swipe API', () => {
  it('should prevent self swiping', async () => {
    const res = await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken1}`)
      .send({ to_user_id: user1Id, action: 'LIKE' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('should record a swipe', async () => {
    const res = await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken1}`)
      .send({ to_user_id: user2Id, action: 'LIKE' });

    expect(res.status).toBe(200);
    expect(res.body.data.swipe.type).toBe('LIKE');
    expect(res.body.data.match).toBeNull();
  });

  it('should create a match on mutual likes', async () => {
    // User 1 likes User 2
    await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken1}`)
      .send({ to_user_id: user2Id, action: 'LIKE' });

    // User 2 likes User 1
    const res = await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ to_user_id: user1Id, action: 'LIKE' });

    expect(res.status).toBe(200);
    expect(res.body.data.match).not.toBeNull();
    expect(res.body.data.match.user1_id).toBe(user2Id); // The one who created the match
  });

  it('should accept a SUPER_LIKE and match it against a LIKE', async () => {
    await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken1}`)
      .send({ to_user_id: user2Id, action: 'SUPER_LIKE' });

    const res = await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken2}`)
      .send({ to_user_id: user1Id, action: 'LIKE' });

    expect(res.status).toBe(200);
    expect(res.body.data.match).not.toBeNull();
  });

  it('should reject an unknown swipe action', async () => {
    const res = await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken1}`)
      .send({ to_user_id: user2Id, action: 'MAYBE' });

    expect(res.status).toBe(400);
  });

  it('should 404 when the target user does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/swipe')
      .set('Authorization', `Bearer ${authToken1}`)
      .send({ to_user_id: '00000000-0000-0000-0000-000000000000', action: 'LIKE' });

    expect(res.status).toBe(404);
  });
});
