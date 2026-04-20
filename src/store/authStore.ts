'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  avatar?: string;
  preferences?: {
    theme: string;
    language: string;
    notifications: boolean;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.login({ email, password });
          const user = res.data.user;
          set({ user, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password, confirmPassword) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.register({ name, email, password, confirmPassword });
          const user = res.data.user;
          set({ user, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch { /* ignore */ }
        disconnectSocket();
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') window.location.href = '/login';
      },

      fetchMe: async () => {
        try {
          const res = await authAPI.getMe();
          set({ user: res.data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
