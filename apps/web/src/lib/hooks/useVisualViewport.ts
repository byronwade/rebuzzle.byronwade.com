"use client";

import { useCallback, useEffect, useState } from "react";

interface VisualViewportState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  visualViewportHeight: number;
  visualViewportWidth: number;
}

const KEYBOARD_THRESHOLD = 150; // Minimum height difference to consider keyboard visible

/**
 * Hook to detect virtual keyboard visibility using the Visual Viewport API.
 *
 * This hook listens to viewport changes and calculates whether a virtual keyboard
 * is likely visible by comparing window.innerHeight to visualViewport.height.
 *
 * @returns {VisualViewportState} Object containing keyboard state information
 *
 * @example
 * ```tsx
 * const { isKeyboardVisible, keyboardHeight } = useVisualViewport();
 *
 * return (
 *   <div style={{ paddingBottom: keyboardHeight }}>
 *     {isKeyboardVisible ? <MinimalView /> : <FullView />}
 *   </div>
 * );
 * ```
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    keyboardHeight: 0,
    isKeyboardVisible: false,
    visualViewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    visualViewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
  }));

  const updateViewportState = useCallback(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;

    if (!viewport) {
      // Fallback for browsers without Visual Viewport API
      setState({
        keyboardHeight: 0,
        isKeyboardVisible: false,
        visualViewportHeight: window.innerHeight,
        visualViewportWidth: window.innerWidth,
      });
      return;
    }

    // Calculate the difference between window height and visual viewport height
    // This difference represents the keyboard + any browser chrome
    const heightDifference = window.innerHeight - viewport.height;

    // Consider keyboard visible if the difference exceeds threshold
    // and we're on a device likely to have a virtual keyboard (touch device)
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isKeyboardVisible = isTouchDevice && heightDifference > KEYBOARD_THRESHOLD;

    setState({
      keyboardHeight: Math.max(0, heightDifference),
      isKeyboardVisible,
      visualViewportHeight: viewport.height,
      visualViewportWidth: viewport.width,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;

    // Initial state
    updateViewportState();

    if (viewport) {
      // Listen to viewport resize (keyboard open/close)
      viewport.addEventListener("resize", updateViewportState);
      viewport.addEventListener("scroll", updateViewportState);
    }

    // Also listen to window resize as a fallback
    window.addEventListener("resize", updateViewportState);

    // Listen for focus events on input elements
    // This helps detect keyboard on devices where Visual Viewport might be slow
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        // Small delay to let keyboard animation start
        setTimeout(updateViewportState, 100);
        setTimeout(updateViewportState, 300);
      }
    };

    const handleFocusOut = () => {
      // Delay to let keyboard close animation complete
      setTimeout(updateViewportState, 100);
      setTimeout(updateViewportState, 300);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", updateViewportState);
        viewport.removeEventListener("scroll", updateViewportState);
      }
      window.removeEventListener("resize", updateViewportState);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [updateViewportState]);

  return state;
}

/**
 * Simpler hook that just returns whether keyboard is visible.
 * Use this when you don't need the full viewport state.
 */
export function useIsKeyboardVisible(): boolean {
  const { isKeyboardVisible } = useVisualViewport();
  return isKeyboardVisible;
}
