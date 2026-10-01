import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { API_URL as BACKEND_URL } from '../lib/config';
import { apiGet } from '../lib/api';

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
  /** True once the conversation list has been fetched at least once */
  conversationsLoaded: boolean;
  isConnected: boolean;
  typingUsers: Record<string, boolean>; // userId -> isTyping
  /** A match is ringing us right now (userId of the caller) */
  incomingCallFrom: string | null;
  /** The call we are currently in / dialling (partner's userId) */
  activeCallWith: string | null;
  setActiveCall: (partnerId: string | null) => void;
  dismissIncomingCall: (decline: boolean) => void;

  connectSocket: () => void;
  disconnectSocket: () => void;
  sendMessage: (toUserId: string, content: string, mediaUrl?: string) => void;
  setTyping: (toUserId: string, isTyping: boolean) => void;
  fetchConversations: () => Promise<void>;
  markRead: (messageId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  activeUsers: [],
  messages: [],
  conversations: [],
  conversationsLoaded: false,
  isConnected: false,
  typingUsers: {},
  incomingCallFrom: null,
  activeCallWith: null,

  setActiveCall: (partnerId) => set({ activeCallWith: partnerId }),

  dismissIncomingCall: (decline) => {
    const { socket, incomingCallFrom } = get();
    if (decline && socket && incomingCallFrom) {
      socket.emit('call_declined', { partnerId: incomingCallFrom });
    }
    set({ incomingCallFrom: null });
  },

  connectSocket: () => {
    const { user, token } = useAuthStore.getState();
    const { socket } = get();

    // Only connect if user is logged in and no existing socket
    if (!user || !token || socket) return;

    // Pass Bearer token in auth handshake so backend middleware can verify it.
    // `auth` is a function so every (re)connection attempt presents the CURRENT access
    // token — a socket created with a fixed token could never reconnect after it expired.
    const newSocket = io(BACKEND_URL, {
      auth: (cb) => cb({ token: useAuthStore.getState().token }),
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      set({ isConnected: true, socket: newSocket });
    });

    newSocket.on('connect_error', async (err) => {
      console.warn('[Socket] Connection error:', err.message);
      // Expired access token: get a new one, the next reconnection attempt will use it
      if (/Invalid token/i.test(err.message)) {
        await useAuthStore.getState().refreshAccessToken();
      }
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
    const toMessage = (message: any): Message => ({
      id: message.id,
      fromUserId: message.from_user,
      toUserId: message.to_user,
      content: message.content,
      mediaUrl: message.media_url,
      createdAt: message.created_at,
      is_read: message.is_read,
      is_edited: message.is_edited,
      is_deleted: message.is_deleted,
    });

    // Backend emits 'receiveMessage' (camelCase) — align with socket.ts
    newSocket.on('receiveMessage', ({ message }: { message: any }) => {
      const msg = toMessage(message);
      set((state) => (state.messages.some((m) => m.id === msg.id) ? {} : { messages: [...state.messages, msg] }));
      get().fetchConversations();
    });

    // Confirmation of our own sent message: swap the oldest matching optimistic entry
    // (and only that one) for the real record from the database.
    newSocket.on('messageSent', ({ message }: { message: any }) => {
      const confirmed = toMessage(message);
      set((state) => {
        const index = state.messages.findIndex(
          (m) =>
            m.id.startsWith('temp_') &&
            m.toUserId === confirmed.toUserId &&
            (m.content || '') === (confirmed.content || '') &&
            (m.mediaUrl || '') === (confirmed.mediaUrl || '')
        );
        if (index === -1) return { messages: [...state.messages, confirmed] };
        const next = [...state.messages];
        next[index] = confirmed;
        return { messages: next };
      });
      get().fetchConversations();
    });

    newSocket.on('error', (payload: { message?: string }) => {
      console.warn('[Socket] Server error:', payload?.message);
    });

    // ─── Calls ───────────────────────────────────────────────────────────────
    newSocket.on('call_incoming', ({ from }: { from: string }) => {
      const { activeCallWith } = get();
      if (activeCallWith && activeCallWith !== from) {
        // Already on another call
        newSocket.emit('call_declined', { partnerId: from, reason: 'busy' });
        return;
      }
      if (activeCallWith === from) return; // both rang each other; the call screen handles it
      set({ incomingCallFrom: from });
      if (!get().conversations.some((c) => c.partner.id === from)) get().fetchConversations();
    });

    newSocket.on('call_ended', ({ from }: { from: string }) => {
      if (get().incomingCallFrom === from) set({ incomingCallFrom: null });
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
      socket.removeAllListeners();
      socket.disconnect();
    }
    // A new sign-in must never see the previous member's conversations
    if (socket || get().conversations.length > 0 || get().messages.length > 0) {
      set({ socket: null, isConnected: false, activeUsers: [], typingUsers: {}, messages: [], conversations: [], conversationsLoaded: false, incomingCallFrom: null, activeCallWith: null });
    }
  },

  sendMessage: (toUserId: string, content: string, mediaUrl?: string) => {
    const { socket, messages } = get();
    const { user } = useAuthStore.getState();
    if (socket && user) {
      const tempId = `temp_${Date.now()}`;
      const msg: Message = {
        id: tempId,
        fromUserId: user.id,
        toUserId,
        content,
        mediaUrl,
        createdAt: new Date().toISOString(),
      };
      // Optimistic update
      set({ messages: [...messages, msg] });
      // Backend expects 'sendMessage' (camelCase) with { partnerId, content, media_url }
      socket.emit('sendMessage', { partnerId: toUserId, content, media_url: mediaUrl });
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
    if (!useAuthStore.getState().token) return;
    try {
      // apiGet refreshes an expired access token and retries, unlike a bare fetch
      const res = await apiGet('/api/v1/chat/conversations');
      const json = await res.json();
      if (json.success) {
        set({ conversations: json.data.conversations });
      }
    } catch (err) {
      console.error('[Chat] Failed to fetch conversations:', err);
    } finally {
      set({ conversationsLoaded: true });
    }
  },
}));
