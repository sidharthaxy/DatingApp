import { PrismaClient } from '@prisma/client';
import { redisClient, connectRedis } from '../config/redis';

const prisma = new PrismaClient();

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockImplementation((token) => {
      if (token === 'invalid-token') {
        return Promise.reject(new Error('Invalid token'));
      }
      return Promise.resolve({
        uid: token, // Use token as fake uid
        email: `${token}@test.com`
      });
    })
  }),
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  apps: []
}));

beforeAll(async () => {
  await connectRedis();
});

afterAll(async () => {
  await prisma.$disconnect();
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
});

beforeEach(async () => {
  // Clean tables
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  
  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch (error) {
    console.log('Setup DB truncate error:', error);
  }

  // Clear redis
  await redisClient.flushAll();
});
