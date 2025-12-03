/**
 * Theme System for Rebuzzle Mobile
 * Matches the web app's design tokens from globals.css
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface ThemeFontSizes {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  fontSize: ThemeFontSizes;
}

// Light theme colors (from web's globals.css)
const lightColors: ThemeColors = {
  background: '#FFFFFF',
  foreground: '#171717',
  card: '#FFFFFF',
  cardForeground: '#171717',
  primary: '#171717',
  primaryForeground: '#FAFAFA',
  secondary: '#F5F5F5',
  secondaryForeground: '#171717',
  muted: '#F5F5F5',
  mutedForeground: '#737373',
  accent: '#FACC15', // Brand yellow
  accentForeground: '#1A1A2E',
  border: '#E5E5E5',
  input: '#E5E5E5',
  destructive: '#EF4444',
  destructiveForeground: '#FAFAFA',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
};

// Dark theme colors (from web's globals.css)
const darkColors: ThemeColors = {
  background: '#121212',
  foreground: '#EDEDED',
  card: '#1A1A1A',
  cardForeground: '#EDEDED',
  primary: '#FAFAFA',
  primaryForeground: '#171717',
  secondary: '#262626',
  secondaryForeground: '#FAFAFA',
  muted: '#262626',
  mutedForeground: '#999999',
  accent: '#FACC15', // Brand yellow
  accentForeground: '#1A1A2E',
  border: '#333333',
  input: '#333333',
  destructive: '#7F1D1D',
  destructiveForeground: '#FAFAFA',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
};

// Shared spacing values
const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Shared border radius values
const borderRadius: ThemeBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Shared font sizes
const fontSize: ThemeFontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

// Export themed objects
export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  borderRadius,
  fontSize,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  borderRadius,
  fontSize,
};

/**
 * Get theme by mode
 */
export function getTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'light' ? lightTheme : darkTheme;
}

/**
 * Helper to create rgba from hex
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Helper to lighten/darken a hex color
 */
export function adjustColor(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
