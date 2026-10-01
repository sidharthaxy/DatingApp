import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../lib/config';

export type UserStatus = 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ELITE';

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  status: UserStatus;
  is_profile_complete: boolean;
  /** Whether a KYC video has been submitted (discovery is locked until it has). */
  has_kyc: boolean;
  subscription_tier: SubscriptionTier;
}

const REFRESH_TOKEN_KEY = '@minglex_refresh_token';

// Safe storage wrapper — AsyncStorage on web (Expo Go) can throw if
// the localstorage-file flag is invalid. We fall back to in-memory.
const memoryStore: Record<string, string> = {};
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
  },
};

/** Normalises the user object returned by /auth/google, /auth/verify, /auth/refresh and /users/me. */
export const toSessionUser = (raw: any): User => ({
  id: raw.id,
  email: raw.email ?? null,
  phone: raw.phone ?? null,
  first_name: raw.first_name ?? null,
  status: raw.status,
  is_profile_complete: raw.is_profile_complete ?? false,
  has_kyc: raw.has_kyc ?? !!raw.kyc_video_url,
  subscription_tier: raw.subscription_tier ?? 'FREE',
});

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  /** Merge fields into the current user (no-op when signed out) */
  patchUser: (patch: Partial<User>) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  /** Store everything a successful login returns, including the persisted refresh token */
  startSession: (session: AuthSession) => Promise<User>;
  /** Persist refresh token to AsyncStorage (survives app restarts) */
  persistRefreshToken: (token: string) => Promise<void>;
  /** Restore the session from the stored refresh token on app boot */
  loadPersistedAuth: () => Promise<void>;
  /** Silently refresh the access token using the stored refresh token */
  refreshAccessToken: () => Promise<string | null>;
  /** Re-read the signed-in member from the server (after onboarding, KYC, approval…) */
  reloadUser: () => Promise<User | null>;
  /** Full logout - clear tokens from state and storage */
  logout: () => Promise<void>;
}

// A single in-flight refresh shared by every caller. Refresh tokens rotate, so two parallel
// refreshes would have one of them present an already-replaced token; and callers that
// arrived mid-refresh used to be handed the stale access token and fail again.
let refreshInFlight: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  patchUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
  setToken: (token) => set({ token }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),

  startSession: async ({ accessToken, refreshToken, user }) => {
    const sessionUser = toSessionUser(user);
    set({ token: accessToken, user: sessionUser });
    await get().persistRefreshToken(refreshToken);
    return sessionUser;
  },

  persistRefreshToken: async (token: string) => {
    set({ refreshToken: token });
    try {
      await safeStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.error('[AuthStore] Failed to persist refresh token:', e);
    }
  },

  loadPersistedAuth: async () => {
    try {
      const storedRefreshToken = await safeStorage.getItem(REFRESH_TOKEN_KEY);
      if (storedRefreshToken) {
        set({ refreshToken: storedRefreshToken });
        // Exchanges the refresh token for a fresh access token AND the user record, so a
        // page reload / app restart lands back in the app instead of on the login screen.
        await get().refreshAccessToken();
      }
    } catch (e) {
      console.error('[AuthStore] Failed to load persisted auth:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshAccessToken: (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight;

    const { refreshToken } = get();
    if (!refreshToken) return Promise.resolve(null);

    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const data = await res.json();

        if (data.success) {
          const newAccessToken: string = data.data.accessToken;
          set({
            token: newAccessToken,
            ...(data.data.user ? { user: toSessionUser(data.data.user) } : {}),
          });
          // Rotate refresh token (the server issues a new one)
          await get().persistRefreshToken(data.data.refreshToken);
          return newAccessToken;
        }

        if (res.status === 401 || res.status === 403) {
          // Refresh token expired or revoked → the session is over
          await get().logout();
        }
        return null;
      } catch (e) {
        // Network failure: keep the session so the app recovers when connectivity returns
        console.warn('[AuthStore] Token refresh failed (network):', e);
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  },

  reloadUser: async () => {
    const request = (token: string | null) =>
      fetch(`${API_URL}/api/v1/users/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    try {
      let res = await request(get().token);
      if (res.status === 401) {
        const newToken = await get().refreshAccessToken();
        if (!newToken) return get().user;
        res = await request(newToken);
      }
      const data = await res.json();
      if (data.success) {
        const user = toSessionUser(data.data);
        set({ user });
        return user;
      }
    } catch (e) {
      console.warn('[AuthStore] Failed to reload user:', e);
    }
    return get().user;
  },

  logout: async () => {
    const { token } = get();
    // Clear local state first so the UI reacts immediately, even if the network is down
    set({ user: null, token: null, refreshToken: null });
    try {
      await safeStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('[AuthStore] Failed to clear stored token:', e);
    }
    if (token) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('[AuthStore] Logout request failed:', e);
      }
    }
  },
}));
