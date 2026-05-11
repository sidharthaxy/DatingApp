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
connectRedis().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server initialized on port ${PORT}`);
    // Start daily AI recommendations cron (fires at 9 AM daily)
    if (process.env.NODE_ENV !== 'test') {
      startDailyRecommendationsJob();
    }
  });
}).catch(err => {
  console.error('Failed to connect to Redis', err);
});

