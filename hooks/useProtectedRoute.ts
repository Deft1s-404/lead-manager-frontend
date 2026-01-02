'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from './useAuth';

export const useProtectedRoute = () => {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!token) {
      router.replace('/login');
      return;
    }

    setIsReady(true);
  }, [router, token, loading]);

  return isReady;
};
