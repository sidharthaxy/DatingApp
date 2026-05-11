import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { redisClient } from './redis';
import { sendPushNotification } from '../services/notification.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

interface AuthSocket extends Socket {
  userId: string;
}

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: No token'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as AuthSocket).userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = (socket as AuthSocket).userId;
    console.log(`User connected: ${userId} (${socket.id})`);

    // Store user as online in Redis
    await redisClient.set(`online_users:${userId}`, socket.id);
    
    // Broadcast status
    socket.broadcast.emit('user_online', { userId });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      await redisClient.del(`online_users:${userId}`);
      socket.broadcast.emit('user_offline', { userId });
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      const { partnerId, content, media_url } = data;
      
      const match = await prisma.match.findFirst({
        where: {
          OR: [
            { user1_id: userId, user2_id: partnerId },
            { user1_id: partnerId, user2_id: userId },
          ]
        }
      });

      if (!match) {
        return socket.emit('error', { message: 'Cannot send message to non-match' });
      }

      const message = await prisma.message.create({
        data: {
          from_user: userId,
          to_user: partnerId,
          content,
          media_url
        }
      });

      socket.emit('messageSent', { message });

      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('receiveMessage', { message });
      } else {
        // Partner is offline, send push notification
        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { first_name: true } });
        await sendPushNotification(
          partnerId,
          'New Message',
          `${sender?.first_name || 'Someone'} sent you a message.`,
          { type: 'MESSAGE', messageId: message.id }
        );
      }
    });

    // Handle reading a message
    socket.on('readMessage', async (data) => {
      const { messageId } = data;
      
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (message && message.to_user === userId) {
        await prisma.message.update({
          where: { id: messageId },
          data: { is_read: true }
        });

        const senderSocketId = await redisClient.get(`online_users:${message.from_user}`);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messageRead', { messageId, by: userId });
        }
      }
    });

    // Handle typing
    socket.on('typing', async (data) => {
      const { partnerId, isTyping } = data;
      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('typingStatus', { userId, isTyping });
      }
    });

    // Handle edit message
    socket.on('editMessage', async (data) => {
      const { messageId, newContent } = data;
      
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message || message.from_user !== userId) return;

      const fiveMins = 5 * 60 * 1000;
      if (Date.now() - message.created_at.getTime() > fiveMins) {
        return socket.emit('error', { message: 'Can only edit messages within 5 minutes' });
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { content: newContent, is_edited: true }
      });

      socket.emit('messageEdited', { message: updatedMessage });

      const partnerSocketId = await redisClient.get(`online_users:${message.to_user}`);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('messageEdited', { message: updatedMessage });
      }
    });

    // Handle delete message
    socket.on('deleteMessage', async (data) => {
      const { messageId } = data;
      
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message || message.from_user !== userId) return;

      const fiveMins = 5 * 60 * 1000;
      if (Date.now() - message.created_at.getTime() > fiveMins) {
        return socket.emit('error', { message: 'Can only delete messages within 5 minutes' });
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { content: '', media_url: null, is_deleted: true }
      });

      socket.emit('messageDeleted', { messageId });

      const partnerSocketId = await redisClient.get(`online_users:${message.to_user}`);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('messageDeleted', { messageId });
      }
    });

    // ─── WebRTC Signaling ──────────────────────────────────────────────────────────
    socket.on('call_initiated', async (data) => {
      const { partnerId } = data;
      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('call_incoming', { from: userId });
      } else {
        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { first_name: true } });
        await sendPushNotification(
          partnerId,
          'Incoming Video Call',
          `${sender?.first_name || 'Someone'} is calling you.`,
          { type: 'CALL' }
        );
      }
    });

    socket.on('webrtc_offer', async (data) => {
      const { partnerId, offer } = data;
      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) io.to(partnerSocketId).emit('webrtc_offer', { from: userId, offer });
    });

    socket.on('webrtc_answer', async (data) => {
      const { partnerId, answer } = data;
      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) io.to(partnerSocketId).emit('webrtc_answer', { from: userId, answer });
    });

    socket.on('webrtc_ice_candidate', async (data) => {
      const { partnerId, candidate } = data;
      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) io.to(partnerSocketId).emit('webrtc_ice_candidate', { from: userId, candidate });
    });

    socket.on('call_ended', async (data) => {
      const { partnerId } = data;
      const partnerSocketId = await redisClient.get(`online_users:${partnerId}`);
      if (partnerSocketId) io.to(partnerSocketId).emit('call_ended', { from: userId });
    });
  });

  return io;
};
