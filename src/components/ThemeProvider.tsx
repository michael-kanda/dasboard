// src/components/ThemeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Standard-Theme wenn nichts in localStorage steht */
  defaultTheme?: Theme;
}

export default function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Beim Mount: Theme aus localStorage lesen
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('datapeak-theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
        document.documentElement.classList.toggle('dark', stored === 'dark');
      }
    } catch (e) {
      // localStorage nicht verfügbar (SSR, Privacy-Mode etc.)
      console.warn('Could not read theme from localStorage:', e);
    }
  }, []);

  // Theme-Änderungen anwenden
  useEffect(() => {
    if (!mounted) return;
    
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    try {
      localStorage.setItem('datapeak-theme', theme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Hydration mismatch vermeiden: Erst nach Mount rendern
  // (Kinder werden sofort gerendert, aber Theme-abhängige Klassen
  //  flashen nicht, weil das html-Element die Klasse trägt)
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
