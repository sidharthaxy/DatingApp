import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;
let userId: string;
let targetUserId: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'favorites_test_user' });
  authToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;

  const target = await prisma.user.create({
    data: {
      firebase_uid: 'favorite_target_' + Date.now(),
      status: 'APPROVED',
      first_name: 'Target',
      discover_enabled: true
    }
  });
  targetUserId = target.id;
});

describe('Favorites API', () => {
  it('should toggle a favorite (add then remove)', async () => {
    // Add favorite
    const addRes = await request(app)
      .post(`/api/v1/favorites/${targetUserId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.action).toBe('added');

    // Get favorites
    const getRes = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${authToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.favorites.length).toBeGreaterThan(0);

    // Remove favorite
    const removeRes = await request(app)
      .post(`/api/v1/favorites/${targetUserId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.action).toBe('removed');
  });

  it('should enforce 100 favorites limit', async () => {
    // Create 100 favorites directly in DB
    const fakeTargets = Array.from({ length: 100 }).map((_, i) => ({
      id: `fake_target_${i}_${Date.now()}`,
      firebase_uid: `fake_uid_${i}_${Date.now()}`
    }));
    await prisma.user.createMany({ data: fakeTargets });

    const favoritesData = fakeTargets.map(t => ({
      user_id: userId,
      target_id: t.id
    }));
    await prisma.favorite.createMany({ data: favoritesData });

    // Try adding 101st
    const res = await request(app)
      .post(`/api/v1/favorites/${targetUserId}`)
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 400) console.log(res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LIMIT_REACHED');
  });
});
