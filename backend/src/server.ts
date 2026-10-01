import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectRedis } from './config/redis';
import { PrismaClient } from '@prisma/client';
import { startDailyRecommendationsJob } from './jobs/dailyRecommendations.job';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Create HTTP Server
import { initSocket } from './config/socket';

const server = http.createServer(app);

// Initialize robust Socket.IO server
const io = initSocket(server);

// Start Server
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`);
  } else {
    console.error('❌ HTTP server error:', err);
  }
  process.exit(1);
});

// A stray rejected promise must not take every connected user down with it
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const start = async () => {
  try {
    await connectRedis();
  } catch (err: any) {
    console.error('❌ Could not connect to Redis:', err?.message || err);
    console.error('   Start it with "brew services start redis" (or check REDIS_URL in backend/.env).');
    process.exit(1);
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    console.error('❌ Could not connect to PostgreSQL:', err?.message || err);
    console.error('   Check DATABASE_URL in backend/.env, then run "npm run db:push".');
    process.exit(1);
  }

  // Bind on all interfaces so phones on the same Wi-Fi can reach the API too
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server initialized on port ${PORT}`);
    // Start daily AI recommendations cron (fires at 9 AM daily)
    if (process.env.NODE_ENV !== 'test') {
      startDailyRecommendationsJob();
    }
  });
};

start();
