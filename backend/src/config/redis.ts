import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const blacklistToken = async (token: string, expiresInSeconds: number) => {
  if (expiresInSeconds <= 0) return;
  await redisClient.setEx(`bl_${token}`, expiresInSeconds, 'true');
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redisClient.get(`bl_${token}`);
  return result === 'true';
};
