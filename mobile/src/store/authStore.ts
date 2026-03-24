import { create } from 'zustand';

export type UserStatus = 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  status: UserStatus;
  profile_complete: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  logout: () => set({ user: null, token: null }),
}));
