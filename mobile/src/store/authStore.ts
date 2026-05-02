import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserStatus = 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ELITE';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  first_name?: string | null;
  status: UserStatus;
  is_profile_complete: boolean;
  subscription_tier: SubscriptionTier;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const REFRESH_TOKEN_KEY = '@minglex_refresh_token';
const REFRESH_TOKEN_LOCK_KEY = '@minglex_refresh_lock';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  /** Persist refresh token to AsyncStorage (survives app restarts) */
  persistRefreshToken: (token: string) => Promise<void>;
  /** Load persisted refresh token from storage on app boot */
  loadPersistedAuth: () => Promise<void>;
  /** Silently refresh the access token using the stored refresh token */
  refreshAccessToken: () => Promise<string | null>;
  /** Full logout - clear tokens from state and storage */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  isRefreshing: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),

  persistRefreshToken: async (token: string) => {
    set({ refreshToken: token });
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.error('[AuthStore] Failed to persist refresh token:', e);
    }
  },

  loadPersistedAuth: async () => {
    try {
      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (storedRefreshToken) {
        set({ refreshToken: storedRefreshToken });
        // Attempt to silently get a fresh access token
        await get().refreshAccessToken();
      }
    } catch (e) {
      console.error('[AuthStore] Failed to load persisted auth:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshAccessToken: async (): Promise<string | null> => {
    const { refreshToken, isRefreshing } = get();
    if (!refreshToken) {
      set({ isLoading: false });
      return null;
    }
    // Prevent concurrent refresh calls
    if (isRefreshing) return get().token;

    set({ isRefreshing: true });
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();

      if (data.success) {
        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;
        set({ token: newAccessToken, isLoading: false });
        // Rotate refresh token (the server issues a new one)
        await get().persistRefreshToken(newRefreshToken);
        return newAccessToken;
      } else {
        // Refresh token expired or invalid → force logout
        await get().logout();
        return null;
      }
    } catch (e) {
      console.error('[AuthStore] Token refresh failed:', e);
      return null;
    } finally {
      set({ isRefreshing: false });
    }
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error('[AuthStore] Logout request failed:', e);
      }
    }
    try {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('[AuthStore] Failed to clear stored token:', e);
    }
    set({ user: null, token: null, refreshToken: null });
  },
}));
