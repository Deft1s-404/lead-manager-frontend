import { AuthenticatedSeller, User } from '../types';

const TOKEN_KEY = 'mvpcrm_token';
const USER_KEY = 'mvpcrm_user';
const SELLER_KEY = 'mvpcrm_seller';

export interface StoredAuth {
  token: string;
  user: User;
  seller: AuthenticatedSeller | null;
}

export const getStoredAuth = (): StoredAuth | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  const sellerRaw = localStorage.getItem(SELLER_KEY);

  if (!token || !userRaw) {
    return null;
  }

  try {
    const user: User = JSON.parse(userRaw);
    let seller: AuthenticatedSeller | null = null;

    if (sellerRaw) {
      try {
        seller = JSON.parse(sellerRaw) as AuthenticatedSeller;
      } catch (sellerError) {
        console.warn('Failed to parse stored seller', sellerError);
        localStorage.removeItem(SELLER_KEY);
      }
    }

    return { token, user, seller };
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    clearStoredAuth();
    return null;
  }
};

export const setStoredAuth = (token: string, user: User, seller: AuthenticatedSeller | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (seller) {
    localStorage.setItem(SELLER_KEY, JSON.stringify(seller));
  } else {
    localStorage.removeItem(SELLER_KEY);
  }
};

export const clearStoredAuth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SELLER_KEY);
};
