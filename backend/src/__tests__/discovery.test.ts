import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'discovery_test_user' });
  authToken = authRes.body.data.accessToken;

  // Set current user as APPROVED with coordinates
  await prisma.user.update({
    where: { firebase_uid: 'discovery_test_user' },
    data: { 
      status: 'APPROVED', 
      latitude: 40.7128, 
      longitude: -74.0060, // NYC
      interested_in: 'WOMEN',
      is_profile_complete: true,
      kyc_video_url: 'http://test.com/video.mp4'
    }
  });

  // Create a candidate (Approved, Female, nearby)
  await prisma.user.create({
    data: {
      firebase_uid: 'candidate_1',
      status: 'APPROVED',
      gender: 'FEMALE',
      latitude: 40.7306, // Nearby
      longitude: -73.9866,
      discover_enabled: true,
      dob: new Date('1995-01-01')
    }
  });

  // Create candidate 2 (Approved, Male, nearby) -> shouldn't match interested_in
  await prisma.user.create({
    data: {
      firebase_uid: 'candidate_2',
      status: 'APPROVED',
      gender: 'MALE',
      latitude: 40.7306,
      longitude: -73.9866,
      discover_enabled: true
    }
  });

  // Create candidate 3 (Approved, Female, far away) -> shouldn't match distance
  await prisma.user.create({
    data: {
      firebase_uid: 'candidate_3',
      status: 'APPROVED',
      gender: 'FEMALE',
      latitude: 34.0522, // LA
      longitude: -118.2437,
      discover_enabled: true
    }
  });

  // Create candidate 4 (Tall, Recently Active)
  await prisma.user.create({
    data: {
      firebase_uid: 'candidate_4',
      status: 'APPROVED',
      gender: 'FEMALE',
      latitude: 40.7306,
      longitude: -73.9866,
      discover_enabled: true,
      height_cm: 185,
      last_login_at: new Date(),
      dob: new Date('2000-01-01')
    }
  });

  // Create candidate 5 (Short, Old Activity)
  await prisma.user.create({
    data: {
      firebase_uid: 'candidate_5',
      status: 'APPROVED',
      gender: 'FEMALE',
      latitude: 40.7306,
      longitude: -73.9866,
      discover_enabled: true,
      height_cm: 150,
      last_login_at: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      dob: new Date('1990-01-01')
    }
  });
});

describe('Discovery API', () => {
  it('should return nearby approved users matching gender preference', async () => {
    const res = await request(app)
      .get('/api/v1/discovery?distance=100')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const users = res.body.data.users;
    expect(users).toHaveLength(3); // candidates 1, 4, 5
    expect(users.map((u: any) => u.firebase_uid)).toContain('candidate_1');
  });

  it('should filter by min_height', async () => {
    const res = await request(app)
      .get('/api/v1/discovery?distance=100&min_height=180')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].firebase_uid).toBe('candidate_4');
  });

  it('should filter by recently_active and sort by ACTIVITY', async () => {
    const res = await request(app)
      .get('/api/v1/discovery?distance=100&recently_active=true&sort=ACTIVITY')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const users = res.body.data.users;
    expect(users).toHaveLength(1);
    expect(users[0].firebase_uid).toBe('candidate_4');
  });

  it('should deny access if profile is incomplete', async () => {
    await prisma.user.update({
      where: { firebase_uid: 'discovery_test_user' },
      data: { is_profile_complete: false }
    });

    const res = await request(app)
      .get('/api/v1/discovery')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('DISCOVERY_GATED');
  });
});
