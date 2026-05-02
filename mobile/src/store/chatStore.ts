import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content?: string;
  mediaUrl?: string;
  createdAt: string;
  is_read?: boolean;
  is_edited?: boolean;
  is_deleted?: boolean;
}

export interface Conversation {
  match_id: string;
  partner: {
    id: string;
    first_name: string | null;
    photos: { url: string }[];
    status: string;
  };
  lastMessage: {
    content: string;
    created_at: string;
    from_user: string;
  } | null;
}

export interface ChatState {
  socket: Socket | null;
  activeUsers: string[];
  messages: Message[];
  conversations: Conversation[];
  isConnected: boolean;
  typingUsers: Record<string, boolean>; // userId -> isTyping

  connectSocket: () => void;
  disconnectSocket: () => void;
  sendMessage: (toUserId: string, content: string) => void;
  setTyping: (toUserId: string, isTyping: boolean) => void;
  fetchConversations: () => Promise<void>;
  markRead: (messageId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  activeUsers: [],
  messages: [],
  conversations: [],
  isConnected: false,
  typingUsers: {},

  connectSocket: () => {
    const { user, token } = useAuthStore.getState();
    const { socket } = get();

    // Only connect if user is logged in and no existing socket
    if (!user || !token || socket) return;

    // Pass Bearer token in auth handshake so backend middleware can verify it
    const newSocket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      set({ isConnected: true, socket: newSocket });
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      set({ isConnected: false });
    });

    newSocket.on('user_online', ({ userId }: { userId: string }) => {
      set((state) => ({ activeUsers: [...new Set([...state.activeUsers, userId])] }));
    });

    newSocket.on('user_offline', ({ userId }: { userId: string }) => {
      set((state) => ({ activeUsers: state.activeUsers.filter((id) => id !== userId) }));
    });

    // Backend emits 'receiveMessage' (camelCase) — align with socket.ts
    newSocket.on('receiveMessage', ({ message }: { message: any }) => {
      const msg: Message = {
        id: message.id,
        fromUserId: message.from_user,
        toUserId: message.to_user,
        content: message.content,
        createdAt: message.created_at,
        is_read: message.is_read,
        is_edited: message.is_edited,
        is_deleted: message.is_deleted,
      };
      set((state) => ({ messages: [...state.messages, msg] }));
    });

    // Also listen for confirmation of our own sent message
    newSocket.on('messageSent', ({ message }: { message: any }) => {
      // Update the optimistic message id to the real DB id
      set((state) => ({
        messages: state.messages.map((m) =>
          m.content === message.content && m.fromUserId === message.from_user
            ? { ...m, id: message.id }
            : m
        ),
      }));
    });

    newSocket.on('typingStatus', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [userId]: isTyping },
      }));
    });

    newSocket.on('messageEdited', ({ message }: { message: any }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === message.id ? { ...m, content: message.content, is_edited: true } : m
        ),
      }));
    });

    newSocket.on('messageDeleted', ({ messageId }: { messageId: string }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, content: '', is_deleted: true } : m
        ),
      }));
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeUsers: [], typingUsers: {} });
    }
  },

  sendMessage: (toUserId: string, content: string) => {
    const { socket, messages } = get();
    const { user } = useAuthStore.getState();
    if (socket && user) {
      const tempId = `temp_${Date.now()}`;
      const msg: Message = {
        id: tempId,
        fromUserId: user.id,
        toUserId,
        content,
        createdAt: new Date().toISOString(),
      };
      // Optimistic update
      set({ messages: [...messages, msg] });
      // Backend expects 'sendMessage' (camelCase) with { partnerId, content }
      socket.emit('sendMessage', { partnerId: toUserId, content });
    }
  },

  setTyping: (toUserId: string, isTyping: boolean) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    if (socket && user) {
      // Backend expects 'typing' event with { partnerId, isTyping }
      socket.emit('typing', { partnerId: toUserId, isTyping });
    }
  },

  markRead: (messageId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('readMessage', { messageId });
    }
  },

  fetchConversations: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        set({ conversations: json.data.conversations });
      }
    } catch (err) {
      console.error('[Chat] Failed to fetch conversations:', err);
    }
  },
}));
