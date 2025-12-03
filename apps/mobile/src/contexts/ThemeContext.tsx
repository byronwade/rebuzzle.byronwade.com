/**
 * Theme Context
 * Provides theme state management with light/dark/system mode support
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode, getTheme, lightTheme, darkTheme } from '../lib/theme';

const THEME_STORAGE_KEY = '@rebuzzle/theme_mode';

interface ThemeContextValue {
  /** Current resolved theme object */
  theme: Theme;
  /** Current theme mode setting (light/dark/system) */
  themeMode: ThemeMode;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Set the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Initial theme mode (defaults to 'system') */
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'system' }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Force re-render when system theme changes (if in system mode)
      if (themeMode === 'system') {
        // This will trigger a re-render with the new system scheme
        setThemeModeState('system');
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

  // Resolve the actual theme based on mode
  const resolvedMode: 'light' | 'dark' =
    themeMode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : themeMode;

  const theme = getTheme(resolvedMode);
  const isDark = resolvedMode === 'dark';

  // Set theme mode and persist
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  }, [isDark, setThemeMode]);

  const value: ThemeContextValue = {
    theme,
    themeMode,
    isDark,
    setThemeMode,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get just the colors (convenience)
 */
export function useColors() {
  const { theme } = useTheme();
  return theme.colors;
}

/**
 * Hook to get themed styles creator
 */
export function useThemedStyles<T>(
  createStyles: (theme: Theme) => T
): T {
  const { theme } = useTheme();
  return createStyles(theme);
}
