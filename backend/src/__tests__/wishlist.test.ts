import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;
let authToken2: string;
let userId: string;
let targetUserId: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'wishlist_test_user' });
  authToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;

  const authRes2 = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'wishlist_other_user' });
  authToken2 = authRes2.body.data.accessToken;

  const target = await prisma.user.create({
    data: {
      firebase_uid: 'wishlist_target_' + Date.now(),
      status: 'APPROVED'
    }
  });
  targetUserId = target.id;
});

describe('Wishlist API', () => {
  it('should create, update, and get wishlist', async () => {
    const createRes = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'My List', is_public: false });
    
    expect(createRes.status).toBe(201);
    const wishlistId = createRes.body.data.wishlist.id;

    // Add member
    const addRes = await request(app)
      .post(`/api/v1/wishlists/${wishlistId}/members/${targetUserId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(addRes.status).toBe(200);

    // Get list
    const getRes = await request(app)
      .get(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(getRes.body.data.wishlist.members.length).toBe(1);

    // Cannot view private list as another user
    const failRes = await request(app)
      .get(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${authToken2}`);
    expect(failRes.status).toBe(403);

    // Update to public
    await request(app)
      .put(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ is_public: true });

    // Can now view as another user
    const passRes = await request(app)
      .get(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${authToken2}`);
    expect(passRes.status).toBe(200);
  });
});
