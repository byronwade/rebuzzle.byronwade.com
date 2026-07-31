/**
 * Platform Context and Hooks
 *
 * Provides platform-specific functionality to UI components through React Context.
 * Each app (web/desktop/mobile) provides its own Platform implementation.
 */

import { createContext, useContext, type ReactNode } from "react";
import type {
  Platform,
  PlatformNavigation,
  PlatformAnalytics,
  PlatformHaptics,
  PlatformAuth,
  PlatformStorage,
  PlatformApi,
} from "./types";

const PlatformContext = createContext<Platform | null>(null);

interface PlatformProviderProps {
  platform: Platform;
  children: ReactNode;
}

/**
 * PlatformProvider
 *
 * Wrap your app with this provider and pass in the platform-specific implementation.
 *
 * @example
 * // In desktop app
 * import { PlatformProvider } from '@rebuzzle/ui/platform';
 * import { desktopPlatform } from './platform';
 *
 * function App() {
 *   return (
 *     <PlatformProvider platform={desktopPlatform}>
 *       <GamePage />
 *     </PlatformProvider>
 *   );
 * }
 */
export function PlatformProvider({ platform, children }: PlatformProviderProps) {
  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * usePlatform
 *
 * Returns the full platform object. Use this when you need access to multiple
 * platform features or want to check the platform type.
 *
 * @throws Error if used outside PlatformProvider
 */
export function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (!platform) {
    throw new Error("usePlatform must be used within a PlatformProvider");
  }
  return platform;
}

/**
 * useNavigation
 *
 * Access navigation methods: push, replace, back, getCurrentPath
 */
export function useNavigation(): PlatformNavigation {
  const platform = usePlatform();
  return platform.navigation;
}

/**
 * useAnalytics
 *
 * Access analytics tracking: trackEvent, trackPuzzleStart, trackPuzzleComplete, trackPuzzleAbandon
 */
export function useAnalytics(): PlatformAnalytics {
  const platform = usePlatform();
  return platform.analytics;
}

/**
 * useHaptics
 *
 * Access haptic feedback: tap, success, error, warning, celebration, submit
 */
export function useHaptics(): PlatformHaptics {
  const platform = usePlatform();
  return platform.haptics;
}

/**
 * useAuth
 *
 * Access authentication state and methods: isAuthenticated, user, login, logout, refreshAuth
 */
export function useAuth(): PlatformAuth {
  const platform = usePlatform();
  return platform.auth;
}

/**
 * useStorage
 *
 * Access persistent storage: get, set, remove
 */
export function useStorage(): PlatformStorage {
  const platform = usePlatform();
  return platform.storage;
}

/**
 * useApi
 *
 * Access API client: baseUrl, fetch
 *
 * The fetch method automatically handles authentication headers and base URL.
 *
 * @example
 * const api = useApi();
 * const puzzle = await api.fetch<PuzzleData>('/api/puzzle/today');
 */
export function useApi(): PlatformApi {
  const platform = usePlatform();
  return platform.api;
}

/**
 * usePlatformType
 *
 * Returns the current platform type: 'web' | 'desktop' | 'mobile'
 *
 * Useful for conditional rendering based on platform.
 *
 * @example
 * const platformType = usePlatformType();
 * if (platformType === 'desktop') {
 *   // Show desktop-specific UI
 * }
 */
export function usePlatformType(): Platform["type"] {
  const platform = usePlatform();
  return platform.type;
}
