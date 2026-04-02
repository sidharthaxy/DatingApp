import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { Platform } from 'react-native';

// Adjust for actual backend URL (e.g. your local IP, or production URL)
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content?: string;
  mediaUrl?: string;
  createdAt: string;
}

export interface ChatState {
  socket: Socket | null;
  activeUsers: string[];
  messages: Message[];
  isConnected: boolean;
  connectSocket: () => void;
  disconnectSocket: () => void;
  sendMessage: (toUserId: string, content: string) => void;
  setTyping: (toUserId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  activeUsers: [],
  messages: [],
  isConnected: false,

  connectSocket: () => {
    const { user } = useAuthStore.getState();
    const { socket } = get();
    
    // Only connect if user is logged in and no existing socket
    if (!user || socket) return;

    const newSocket = io(BACKEND_URL);

    newSocket.on('connect', () => {
      set({ isConnected: true, socket: newSocket });
      newSocket.emit('join', user.id);
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
    });

    newSocket.on('user_online', ({ userId }: { userId: string }) => {
      set((state) => ({ activeUsers: [...new Set([...state.activeUsers, userId])] }));
    });

    newSocket.on('user_offline', ({ userId }: { userId: string }) => {
      set((state) => ({ activeUsers: state.activeUsers.filter((id) => id !== userId) }));
    });

    newSocket.on('receive_message', (data: Message) => {
      set((state) => ({ messages: [...state.messages, data] }));
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeUsers: [] });
    }
  },

  sendMessage: (toUserId: string, content: string) => {
    const { socket, messages } = get();
    const { user } = useAuthStore.getState();
    if (socket && user) {
      const msg: Message = {
        id: Date.now().toString(),
        fromUserId: user.id,
        toUserId,
        content,
        createdAt: new Date().toISOString()
      };
      // Optimistic update
      set({ messages: [...messages, msg] });
      socket.emit('send_message', msg);
    }
  },

  setTyping: (toUserId: string, isTyping: boolean) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    if (socket && user) {
      socket.emit(isTyping ? 'typing' : 'stop_typing', { 
        fromUserId: user.id, 
        toUserId 
      });
    }
  }
}));
