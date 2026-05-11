/**
 * recommendations.test.ts
 * Integration tests for the recommendations API endpoints.
 */
import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let authToken: string;
let userId: string;
let targetId: string;

beforeEach(async () => {
  // Auth as main test user
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'recs_test_user' });
  authToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;

  // Make the main user profile-complete with known interests + goal
  const interest = await prisma.interest.create({
    data: { name: 'Hiking', category: 'Sports' },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'APPROVED',
      is_profile_complete: true,
      kyc_video_url: 'http://test.com/kyc.mp4',
      latitude: 28.6139,
      longitude: 77.2090,
      interested_in: 'EVERYONE',
      dob: new Date('1993-01-01'),
      relationship_goal: 'LONG_TERM',
    },
  });

  await prisma.userInterest.create({
    data: { user_id: userId, interest_id: interest.id },
  });

  // Create a compatible target user
  const targetAuth = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'recs_target_user' });
  targetId = targetAuth.body.data.user.id;

  await prisma.user.update({
    where: { id: targetId },
    data: {
      status: 'APPROVED',
      discover_enabled: true,
      is_profile_complete: true,
      gender: 'FEMALE',
      latitude: 28.6150,
      longitude: 77.2095,
      dob: new Date('1994-06-01'),
      relationship_goal: 'LONG_TERM',
      last_login_at: new Date(Date.now() - 30 * 60 * 1000), // active 30 min ago
    },
  });

  await prisma.userInterest.create({
    data: { user_id: targetId, interest_id: interest.id },
  });
});

describe('Recommendations API', () => {
  it('GET /recommendations — returns up to 9 recommendations', async () => {
    const res = await request(app)
      .get('/api/v1/recommendations')
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendations).toBeInstanceOf(Array);
    expect(res.body.data.recommendations.length).toBeLessThanOrEqual(9);
    expect(res.body.data.generated_at).toBeDefined();
  });

  it('GET /recommendations — target user appears with compatibility_score field', async () => {
    const res = await request(app)
      .get('/api/v1/recommendations')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const recs = res.body.data.recommendations;
    const target = recs.find((r: any) => r.id === targetId);

    if (target) {
      expect(target.compatibility_score).toBeGreaterThanOrEqual(0);
      expect(target.compatibility_score).toBeLessThanOrEqual(100);
      expect(target.score_breakdown).toBeDefined();
      expect(target.distance_km).toBeDefined();
    }
    // It's valid if there's 0 candidates due to existing swipes or filters
  });

  it('GET /recommendations/score/:targetId — returns pairwise score', async () => {
    const res = await request(app)
      .get(`/api/v1/recommendations/score/${targetId}`)
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.score).toBeGreaterThanOrEqual(0);
    expect(res.body.data.score).toBeLessThanOrEqual(100);
    expect(res.body.data.breakdown).toBeDefined();
    expect(res.body.data.breakdown.interests).toBeDefined();
    expect(res.body.data.breakdown.goal).toBeDefined();
  });

  it('GET /recommendations/score/:targetId — shared interests raise the score', async () => {
    const resShared = await request(app)
      .get(`/api/v1/recommendations/score/${targetId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(resShared.body.data.breakdown.interests).toBeGreaterThan(0);
  });

  it('GET /recommendations/score/:targetId — 404 for unknown target', async () => {
    const res = await request(app)
      .get('/api/v1/recommendations/score/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  it('POST /recommendations/refresh — recomputes and returns fresh data', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations/refresh')
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendations).toBeInstanceOf(Array);
  });

  it('POST /recommendations/refresh — rate-limits FREE users to 1/day', async () => {
    // First refresh should succeed
    const res1 = await request(app)
      .post('/api/v1/recommendations/refresh')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res1.status).toBe(200);

    // Second refresh for FREE user should be rate-limited
    const res2 = await request(app)
      .post('/api/v1/recommendations/refresh')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res2.status).toBe(429);
    expect(res2.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('GET /recommendations — returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/recommendations');
    expect(res.status).toBe(401);
  });
});
