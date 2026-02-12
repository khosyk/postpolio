import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from '@/constants/storage';

type ColorScheme = 'light' | 'dark' | null;

interface ThemeContextType {
  colorScheme: ColorScheme;
  isDark: boolean;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const systemColorScheme = useRNColorScheme();

  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(storageKeys.settings.theme);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setColorScheme(savedTheme);
      } else {
        setColorScheme(systemColorScheme ?? 'light');
      }
    } catch {
      setColorScheme(systemColorScheme ?? 'light');
    }
  }, [systemColorScheme]);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  const setTheme = useCallback(async (theme: 'light' | 'dark') => {
    try {
      // AsyncStorage에만 저장 - 다음 앱 구동 시 적용됨
      await AsyncStorage.setItem(storageKeys.settings.theme, theme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      throw error;
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    await loadTheme();
  }, [loadTheme]);

  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ colorScheme, isDark, setTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
