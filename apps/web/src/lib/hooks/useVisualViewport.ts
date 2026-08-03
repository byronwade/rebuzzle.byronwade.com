"use client";

import { useCallback, useEffect, useState } from "react";

interface VisualViewportState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  visualViewportHeight: number;
  visualViewportWidth: number;
}

const KEYBOARD_THRESHOLD = 120;

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

/**
 * Detect virtual keyboard via Visual Viewport + optimistic input focus on touch.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    keyboardHeight: 0,
    isKeyboardVisible: false,
    visualViewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    visualViewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
  }));
  const [focusArmed, setFocusArmed] = useState(false);

  const updateViewportState = useCallback((opts?: { focusArmed?: boolean }) => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    const touch = isTouchDevice();
    const armed = opts?.focusArmed ?? false;

    if (!viewport) {
      setState({
        keyboardHeight: 0,
        isKeyboardVisible: touch && armed,
        visualViewportHeight: window.innerHeight,
        visualViewportWidth: window.innerWidth,
      });
      return;
    }

    const heightDifference = Math.max(0, window.innerHeight - viewport.height);
    const viewportSaysOpen = touch && heightDifference > KEYBOARD_THRESHOLD;
    const isKeyboardVisible = viewportSaysOpen || (touch && armed);

    setState({
      keyboardHeight: viewportSaysOpen ? heightDifference : armed ? Math.max(heightDifference, 280) : 0,
      isKeyboardVisible,
      visualViewportHeight: viewport.height,
      visualViewportWidth: viewport.width,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    updateViewportState({ focusArmed });

    const onResize = () => updateViewportState({ focusArmed });
    if (viewport) {
      viewport.addEventListener("resize", onResize);
      viewport.addEventListener("scroll", onResize);
    }
    window.addEventListener("resize", onResize);

    const handleFocusIn = (e: FocusEvent) => {
      if (!isEditableTarget(e.target) || !isTouchDevice()) return;
      setFocusArmed(true);
      updateViewportState({ focusArmed: true });
      window.setTimeout(() => updateViewportState({ focusArmed: true }), 80);
      window.setTimeout(() => updateViewportState({ focusArmed: true }), 240);
    };

    const handleFocusOut = () => {
      setFocusArmed(false);
      window.setTimeout(() => updateViewportState({ focusArmed: false }), 80);
      window.setTimeout(() => updateViewportState({ focusArmed: false }), 280);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", onResize);
        viewport.removeEventListener("scroll", onResize);
      }
      window.removeEventListener("resize", onResize);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [focusArmed, updateViewportState]);

  return state;
}

export function useIsKeyboardVisible(): boolean {
  const { isKeyboardVisible } = useVisualViewport();
  return isKeyboardVisible;
}
