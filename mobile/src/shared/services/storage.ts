import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../../types/auth';

const KEYS = {
  TOKEN: 'learnova_token',
  USER: 'learnova_user',
  THEME: 'learnova_theme',
  LANG: 'learnova_lang',
} as const;

export const StorageService = {
  // ── Token ────────────────────────────────────────────────────────────────
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.TOKEN, token);
  },

  // ── User ─────────────────────────────────────────────────────────────────
  async getUser(): Promise<AuthUser | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEYS.USER);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: AuthUser): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  async getTheme(): Promise<'light' | 'dark' | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEYS.THEME);
      return raw === 'dark' ? 'dark' : raw === 'light' ? 'light' : null;
    } catch {
      return null;
    }
  },

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await SecureStore.setItemAsync(KEYS.THEME, theme);
  },

  // ── Language ─────────────────────────────────────────────────────────────
  async getLang(): Promise<'ar' | 'en' | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEYS.LANG);
      return raw === 'ar' ? 'ar' : raw === 'en' ? 'en' : null;
    } catch {
      return null;
    }
  },

  async setLang(lang: 'ar' | 'en'): Promise<void> {
    await SecureStore.setItemAsync(KEYS.LANG, lang);
  },

  // ── Clear all ────────────────────────────────────────────────────────────
  async clear(): Promise<void> {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(KEYS.TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER),
    ]);
  },
};
