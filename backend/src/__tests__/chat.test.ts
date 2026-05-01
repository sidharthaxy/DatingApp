import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let token1: string;
let token2: string;
let token3: string;
let user1Id: string;
let user2Id: string;
let user3Id: string;

beforeEach(async () => {
  const r1 = await request(app).post('/api/v1/auth/google').send({ idToken: 'chatter_1' });
  token1 = r1.body.data.accessToken;
  user1Id = r1.body.data.user.id;

  const r2 = await request(app).post('/api/v1/auth/google').send({ idToken: 'chatter_2' });
  token2 = r2.body.data.accessToken;
  user2Id = r2.body.data.user.id;

  const r3 = await request(app).post('/api/v1/auth/google').send({ idToken: 'chatter_3' });
  token3 = r3.body.data.accessToken;
  user3Id = r3.body.data.user.id;

  // Make user 1 and 2 match
  await prisma.match.create({
    data: { user1_id: user1Id, user2_id: user2Id }
  });
});

describe('Chat API', () => {
  it('should allow sending messages between matched users', async () => {
    const res = await request(app)
      .post('/api/v1/chat/send')
      .set('Authorization', `Bearer ${token1}`)
      .send({ partnerId: user2Id, content: 'Hello there' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.content).toBe('Hello there');
  });

  it('should deny sending messages if not matched', async () => {
    const res = await request(app)
      .post('/api/v1/chat/send')
      .set('Authorization', `Bearer ${token1}`)
      .send({ partnerId: user3Id, content: 'Hello there' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_MATCHED');
  });

  it('should retrieve conversation history', async () => {
    await prisma.message.create({
      data: { from_user: user1Id, to_user: user2Id, content: 'First message' }
    });

    const res = await request(app)
      .get(`/api/v1/chat/messages/${user2Id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(1);
    expect(res.body.data.messages[0].content).toBe('First message');
  });
});
