/**
 * Platform Abstraction Layer
 *
 * This module provides platform-agnostic interfaces and hooks that allow
 * UI components to work across web, desktop, and mobile platforms.
 */

// Types
export type {
  Platform,
  PlatformNavigation,
  PlatformAnalytics,
  PlatformHaptics,
  PlatformUser,
  PlatformAuth,
  PlatformStorage,
  PlatformApi,
  ApiResponse,
  // AI suggestion types
  CharacterSuggestion,
  WordSuggestion,
  ContextualHint,
  SuggestionsResponse,
} from "./types";

// Context and Hooks
export {
  PlatformProvider,
  usePlatform,
  useNavigation,
  useAnalytics,
  useHaptics,
  useAuth,
  useStorage,
  useApi,
  usePlatformType,
} from "./context";
