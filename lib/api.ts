import axios from 'axios';

import { clearStoredAuth, getStoredAuth } from './auth-storage';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = getStoredAuth();

    if (stored?.token) {
      config.headers.Authorization = `Bearer ${stored.token}`;
    }

    if (stored?.user?.apiKey) {
      config.headers['x-tenant-key'] = stored.user.apiKey;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      clearStoredAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
