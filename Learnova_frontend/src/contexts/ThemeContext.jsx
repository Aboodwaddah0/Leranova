import { createContext, useContext, useState } from 'react';

const Ctx = createContext({ isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('ln_theme') === 'dark');
  const toggleTheme = () => setIsDark(p => {
    const v = !p;
    localStorage.setItem('ln_theme', v ? 'dark' : 'light');
    return v;
  });
  return <Ctx.Provider value={{ isDark, toggleTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
