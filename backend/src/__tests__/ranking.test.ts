import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;
let userId: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'ranking_test_user' });
  authToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'APPROVED',
      is_profile_complete: true,
      kyc_video_url: 'http://test.com/video.mp4',
      latitude: 0,
      longitude: 0,
      interested_in: 'EVERYONE',
      dob: new Date('1990-01-01')
    }
  });

  const now = Date.now();

  // Create an Old Inactive user (Score 0)
  await prisma.user.create({
    data: {
      firebase_uid: 'old_inactive',
      status: 'APPROVED',
      gender: 'MALE',
      latitude: 0, longitude: 0,
      discover_enabled: true,
      created_at: new Date(now - 10 * 24 * 60 * 60 * 1000), // 10 days old
      last_login_at: new Date(now - 10 * 24 * 60 * 60 * 1000),
      dob: new Date('1995-01-01')
    }
  });

  // Create an Active user (Score 20)
  await prisma.user.create({
    data: {
      firebase_uid: 'active_user',
      status: 'APPROVED',
      gender: 'FEMALE',
      latitude: 0, longitude: 0,
      discover_enabled: true,
      created_at: new Date(now - 10 * 24 * 60 * 60 * 1000),
      last_login_at: new Date(now - 1 * 60 * 60 * 1000), // 1 hour ago
      dob: new Date('1995-01-01')
    }
  });

  // Create a New user (Score 30)
  await prisma.user.create({
    data: {
      firebase_uid: 'new_user',
      status: 'APPROVED',
      gender: 'MALE',
      latitude: 0, longitude: 0,
      discover_enabled: true,
      created_at: new Date(now - 1 * 24 * 60 * 60 * 1000), // 1 day old
      last_login_at: new Date(now - 48 * 60 * 60 * 1000), // 2 days inactive
      dob: new Date('1995-01-01')
    }
  });

  // Create a Boosted user (Score 50)
  await prisma.user.create({
    data: {
      firebase_uid: 'boosted_user',
      status: 'APPROVED',
      gender: 'FEMALE',
      latitude: 0, longitude: 0,
      discover_enabled: true,
      created_at: new Date(now - 10 * 24 * 60 * 60 * 1000),
      last_login_at: new Date(now - 10 * 24 * 60 * 60 * 1000),
      boost_expires_at: new Date(now + 10 * 60 * 1000), // 10 mins from now
      dob: new Date('1995-01-01')
    }
  });
});

describe('Ranking and Analytics API', () => {
  it('should rank users by relevance score (Boosted > New > Active > Old)', async () => {
    const res = await request(app)
      .get(`/api/v1/discovery?sort=RELEVANCE&cb=${Date.now()}`)
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    const users = res.body.data.users;
    
    // Filter to only checking our 4 test users in case db isn't wiped or other users exist
    const testUsers = users.filter((u: any) => 
      ['old_inactive', 'active_user', 'new_user', 'boosted_user'].includes(u.firebase_uid)
    );

    // Check order
    expect(testUsers[0].firebase_uid).toBe('boosted_user'); // 50
    expect(testUsers[1].firebase_uid).toBe('new_user');     // 30
    expect(testUsers[2].firebase_uid).toBe('active_user');  // 20
    expect(testUsers[3].firebase_uid).toBe('old_inactive'); // 0
  });

  it('should grant a boost when calling /boost', async () => {
    const res = await request(app)
      .post('/api/v1/users/boost')
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expires_at).toBeDefined();

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.boost_expires_at).not.toBeNull();
  });

  it('should increment profile views', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/view/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.profile_views).toBe(1);
  });
});
