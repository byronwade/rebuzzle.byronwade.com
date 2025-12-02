"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to get the previous value of a variable
 *
 * @param value - Current value
 * @returns Previous value (undefined on first render)
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 *
 * // prevCount is the value from the previous render
 * console.log(`Changed from ${prevCount} to ${count}`);
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook to check if a value has changed
 *
 * @param value - Value to track
 * @returns Boolean indicating if value changed since last render
 *
 * @example
 * ```tsx
 * const hasChanged = useHasChanged(someValue);
 * if (hasChanged) {
 *   // Value changed since last render
 * }
 * ```
 */
export function useHasChanged<T>(value: T): boolean {
  const prevValue = usePrevious(value);
  return prevValue !== value;
}

/**
 * Hook to track if component is on first render
 *
 * @returns Boolean - true only on first render
 *
 * @example
 * ```tsx
 * const isFirstRender = useIsFirstRender();
 * if (!isFirstRender) {
 *   // Skip logic on first render
 * }
 * ```
 */
export function useIsFirstRender(): boolean {
  const isFirstRef = useRef(true);

  if (isFirstRef.current) {
    isFirstRef.current = false;
    return true;
  }

  return false;
}
