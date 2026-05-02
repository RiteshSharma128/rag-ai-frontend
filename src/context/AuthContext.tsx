'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  avatar: string | null;
  preferences: { theme: string; language: string; notifications: boolean };
  tenant?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount, fetch user if cookie exists
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await authAPI.getMe();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

 const login = async (email: string, password: string): Promise<boolean> => {
  try {
    const { data } = await authAPI.login({ email, password });
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.name}!`);
    return true;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Login failed';
    toast.error(message);
    return false;
  }
};

  const register = async (
    name: string, email: string, password: string, confirmPassword: string
  ): Promise<boolean> => {
    try {
      const { data } = await authAPI.register({ name, email, password, confirmPassword });
      setUser(data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore errors */ }
    setUser(null);
    toast.success('Logged out successfully');
    window.location.href = '/login';
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
