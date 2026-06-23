import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Language, LanguageProgress } from '../types';

export function getCurrentProgress(user: User | null, lang?: Language): LanguageProgress {
  if (!user) return { strengths: [], weaknesses: [] };
  const l = lang || user.activeLanguage;
  return user.progress?.[l] || { strengths: [], weaknesses: [] };
}
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, language?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const userData = await api.post<User>('/auth/login', { email, password });
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string, language?: string) => {
    const userData = await api.post<User>('/auth/register', { email, password, name, language });
    setUser(userData);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
