'use client';

import React from 'react';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'dashboard-theme';
const COOKIE_KEY = 'dashboard-theme';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
};

const writeDomTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });

  const hasMounted = React.useRef(false);

  React.useEffect(() => {
    writeDomTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    localStorage.setItem(STORAGE_KEY, theme);
    document.cookie = `${COOKIE_KEY}=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light' as ThemeMode,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};
