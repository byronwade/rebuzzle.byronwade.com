/**
 * Custom React Hooks
 *
 * Reusable hooks for common patterns across the application.
 *
 * @example
 * ```tsx
 * import {
 *   useLocalStorage,
 *   useDebounce,
 *   useMediaQuery,
 *   useCountdown,
 *   usePrevious
 * } from "@/lib/hooks";
 * ```
 */

export { useCountdown, useStopwatch } from "./useCountdown";

// Timing
export { useDebounce, useDebouncedCallback } from "./useDebounce";
// Storage
export { useLocalStorage } from "./useLocalStorage";

// Media queries
export {
  useIsDesktop,
  useIsMobile,
  useIsTablet,
  useMediaQuery,
  usePrefersDarkMode,
  usePrefersReducedMotion,
} from "./useMediaQuery";

// State tracking
export { useHasChanged, useIsFirstRender, usePrevious } from "./usePrevious";
