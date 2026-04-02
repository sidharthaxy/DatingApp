import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectRedis } from './config/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Create HTTP Server
const server = http.createServer(app);

// Setup Socket.IO for real-time chat
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// User ID to Socket ID mapping for presence
const activeUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Authentication & Presence
  socket.on('join', (userId: string) => {
    activeUsers.set(userId, socket.id);
    socket.join(userId); // Join personal room for targeted events
    io.emit('user_online', { userId });
  });

  // Typing Indicators
  socket.on('typing', ({ fromUserId, toUserId }) => {
    socket.to(toUserId).emit('typing', { fromUserId });
  });

  socket.on('stop_typing', ({ fromUserId, toUserId }) => {
    socket.to(toUserId).emit('stop_typing', { fromUserId });
  });

  // Send/Receive Messages
  socket.on('send_message', async (data: { fromUserId: string; toUserId: string; content?: string; mediaUrl?: string }) => {
    try {
      // Persist logic
      const message = await prisma.message.create({
        data: {
          from_user: data.fromUserId,
          to_user: data.toUserId,
          content: data.content || null,
          media_url: data.mediaUrl || null
        }
      });
      // Relay with inserted message ID and timestamp
      socket.to(data.toUserId).emit('receive_message', { ...data, id: message.id, created_at: message.created_at });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from active users map
    for (const [key, value] of activeUsers.entries()) {
      if (value === socket.id) {
        activeUsers.delete(key);
        io.emit('user_offline', { userId: key });
        break;
      }
    }
  });
});

// Start Server
connectRedis().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server initialized on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to Redis', err);
});
