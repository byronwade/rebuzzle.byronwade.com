"use client";

import { useEffect, useSyncExternalStore } from "react";

export interface VisualViewportFrame {
  /** visualViewport.offsetTop — iOS pans this when the keyboard opens */
  top: number;
  /** visualViewport.height — visible area above the keyboard */
  height: number;
  width: number;
  /** Layout-viewport overlap under the keyboard (≈0 when resizes-content works) */
  keyboardInset: number;
  isKeyboardOpen: boolean;
}

const KEYBOARD_THRESHOLD = 80;

const EMPTY_FRAME: VisualViewportFrame = {
  top: 0,
  height: 0,
  width: 0,
  keyboardInset: 0,
  isKeyboardOpen: false,
};

function readFrame(): VisualViewportFrame {
  if (typeof window === "undefined") {
    return EMPTY_FRAME;
  }

  const vv = window.visualViewport;
  const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
  const layoutWidth = document.documentElement.clientWidth || window.innerWidth;

  if (!vv) {
    return {
      top: 0,
      height: layoutHeight,
      width: layoutWidth,
      keyboardInset: 0,
      isKeyboardOpen: false,
    };
  }

  const top = vv.offsetTop;
  const height = vv.height;
  const width = vv.width;
  // True overlap of the keyboard with the layout viewport (accounts for iOS pan).
  const keyboardInset = Math.max(0, layoutHeight - height - top);
  const isKeyboardOpen = keyboardInset > KEYBOARD_THRESHOLD || top > KEYBOARD_THRESHOLD;

  return { top, height, width, keyboardInset, isKeyboardOpen };
}

function subscribeVisualViewport(onStoreChange: () => void): () => void {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onStoreChange);
  vv?.addEventListener("scroll", onStoreChange);
  window.addEventListener("resize", onStoreChange);

  const onFocusIn = (e: FocusEvent) => {
    const t = e.target;
    if (
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t instanceof HTMLElement && t.isContentEditable)
    ) {
      window.requestAnimationFrame(onStoreChange);
      window.setTimeout(onStoreChange, 50);
      window.setTimeout(onStoreChange, 200);
    }
  };
  const onFocusOut = () => {
    window.setTimeout(onStoreChange, 50);
    window.setTimeout(onStoreChange, 250);
  };
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);

  return () => {
    vv?.removeEventListener("resize", onStoreChange);
    vv?.removeEventListener("scroll", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
  };
}

/**
 * Sync layout to the Visual Viewport.
 *
 * On iOS Safari the layout viewport does NOT shrink for the keyboard — the
 * visual viewport pans/resizes instead. Consumers should pin a fixed shell with
 * `top` + `height` from this hook (not `bottom` / translateY).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
 */
export function useVisualViewportFrame(): VisualViewportFrame {
  const frame = useSyncExternalStore(subscribeVisualViewport, readFrame, () => EMPTY_FRAME);

  // While the keyboard is open, kill document scroll jumps (iOS Safari).
  useEffect(() => {
    if (!frame.isKeyboardOpen) return;
    const lock = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    lock();
    window.addEventListener("scroll", lock, { passive: true });
    return () => window.removeEventListener("scroll", lock);
  }, [frame.isKeyboardOpen]);

  return frame;
}

/** @deprecated Prefer useVisualViewportFrame — kept for older call sites. */
function useVisualViewport() {
  const frame = useVisualViewportFrame();
  return {
    keyboardHeight: frame.keyboardInset,
    isKeyboardVisible: frame.isKeyboardOpen,
    visualViewportHeight: frame.height,
    visualViewportWidth: frame.width,
  };
}

function useIsKeyboardVisible(): boolean {
  return useVisualViewportFrame().isKeyboardOpen;
}
