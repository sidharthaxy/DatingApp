import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectRedis } from './config/redis';
import { PrismaClient } from '@prisma/client';

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
  });
}).catch(err => {
  console.error('Failed to connect to Redis', err);
});
