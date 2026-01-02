'use client';

import { AuthProvider } from '../context/AuthContext';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};
