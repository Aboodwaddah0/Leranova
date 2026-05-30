import { useContext } from 'react';
import { ThemeContext } from '../../app/providers';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside AppProviders');
  return ctx;
}
