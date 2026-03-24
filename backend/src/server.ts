import http from 'http';
import { Server } from 'socket.io';
import app from './app';

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
  socket.on('send_message', (data: { fromUserId: string; toUserId: string; content?: string; mediaUrl?: string }) => {
    // Standard real-time relay, persisting logic is handled by REST API earlier, but could be done here too.
    socket.to(data.toUserId).emit('receive_message', data);
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
server.listen(PORT, () => {
  console.log(`🚀 Server initialized on port ${PORT}`);
});
