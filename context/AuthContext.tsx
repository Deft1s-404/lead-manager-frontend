'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import api from '../lib/api';
import { clearStoredAuth, getStoredAuth, setStoredAuth, StoredAuth } from '../lib/auth-storage';
import { AuthenticatedSeller, User } from '../types';

interface AuthContextValue {
  user: User | null;
  seller: AuthenticatedSeller | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

type LoginSuccessResponse = {
  accessToken: string;
  user: User;
  seller: AuthenticatedSeller | null;
  requiresPasswordChange?: false;
};

type LoginRequiresPasswordChangeResponse = {
  requiresPasswordChange: true;
  passwordSetupToken: string;
  seller: AuthenticatedSeller;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [authState, setAuthState] = useState<StoredAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setAuthState(stored);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<LoginSuccessResponse | LoginRequiresPasswordChangeResponse>('/auth/login', {
        email,
        password
      });

      if ('requiresPasswordChange' in data && data.requiresPasswordChange) {
        const searchParams = new URLSearchParams({
          token: data.passwordSetupToken,
          email: data.seller.email,
          name: data.seller.name
        });
        router.push(`/first-access?${searchParams.toString()}`);
        return;
      }

      setStoredAuth(data.accessToken, data.user, data.seller);
      setAuthState({ token: data.accessToken, user: data.user, seller: data.seller });
      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuthState(null);
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = useMemo(
    () => ({
      user: authState?.user ?? null,
      seller: authState?.seller ?? null,
      token: authState?.token ?? null,
      loading,
      login,
      logout
    }),
    [authState, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro de AuthProvider');
  }
  return context;
};
