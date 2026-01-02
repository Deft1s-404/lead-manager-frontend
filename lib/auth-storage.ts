import { User } from '../types';

const TOKEN_KEY = 'mvpcrm_token';
const USER_KEY = 'mvpcrm_user';

export interface StoredAuth {
  token: string;
  user: User;
}

export const getStoredAuth = (): StoredAuth | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!token || !userRaw) {
    return null;
  }

  try {
    const user: User = JSON.parse(userRaw);
    return { token, user };
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    clearStoredAuth();
    return null;
  }
};

export const setStoredAuth = (token: string, user: User): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
