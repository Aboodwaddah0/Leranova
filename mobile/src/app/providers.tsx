import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { tokens, type ThemeTokens } from '../shared/theme/colors';
import { StorageService } from '../shared/services/storage';

// ── Theme Context ─────────────────────────────────────────────────────────────
interface ThemeContextValue {
  isDark: boolean;
  T: ThemeTokens;
  toggleTheme: () => void;
  isArabic: boolean;
  toggleLang: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Language Context ──────────────────────────────────────────────────────────
interface LangContextValue {
  isArabic: boolean;
  toggleLang: () => void;
}
export const LangContext = createContext<LangContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProviders({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [isArabic, setIsArabic] = useState(false);

  // Bootstrap saved preferences
  useEffect(() => {
    Promise.all([StorageService.getTheme(), StorageService.getLang()]).then(([theme, lang]) => {
      if (theme) setIsDark(theme === 'dark');
      if (lang)  setIsArabic(lang === 'ar');
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      StorageService.setTheme(next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setIsArabic((prev) => {
      const next = !prev;
      StorageService.setLang(next ? 'ar' : 'en');
      return next;
    });
  }, []);

  const T = useMemo<ThemeTokens>(() => (isDark ? tokens.dark : tokens.light) as ThemeTokens, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, T, toggleTheme, isArabic, toggleLang }),
    [isDark, T, toggleTheme, isArabic, toggleLang],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
