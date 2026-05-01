import { create } from 'zustand';

export type UserStatus = 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  status: UserStatus;
  is_profile_complete: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  logout: async () => {
    const { token } = get();
    if (token) {
      try {
        const url = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/logout`;
        await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Logout failed:', e);
      }
    }
    set({ user: null, token: null });
  },
}));
