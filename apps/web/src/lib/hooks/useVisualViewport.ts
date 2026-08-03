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
  /** True once the OSK meaningfully overlaps the layout viewport */
  isKeyboardOpen: boolean;
  /**
   * True only after the keyboard is mostly open. Use this for structural UI
   * (hide chrome, compact puzzle) so mid-animation threshold flips don't thrash layout.
   */
  isLayoutCompact: boolean;
}

const OPEN_ENTER = 96;
const OPEN_EXIT = 40;
const COMPACT_ENTER = 180;
const COMPACT_EXIT = 72;

const EMPTY_FRAME: VisualViewportFrame = {
  top: 0,
  height: 0,
  width: 0,
  keyboardInset: 0,
  isKeyboardOpen: false,
  isLayoutCompact: false,
};

let cachedFrame: VisualViewportFrame = EMPTY_FRAME;
let openLatched = false;
let compactLatched = false;
let rafId = 0;
let listening = false;
const listeners = new Set<() => void>();
const geometryListeners = new Set<(frame: VisualViewportFrame) => void>();

function roundPx(n: number): number {
  return Math.round(n);
}

function framesEqual(a: VisualViewportFrame, b: VisualViewportFrame): boolean {
  return (
    a.top === b.top &&
    a.height === b.height &&
    a.width === b.width &&
    a.keyboardInset === b.keyboardInset &&
    a.isKeyboardOpen === b.isKeyboardOpen &&
    a.isLayoutCompact === b.isLayoutCompact
  );
}

function measureRaw(): Omit<VisualViewportFrame, "isKeyboardOpen" | "isLayoutCompact"> {
  if (typeof window === "undefined") {
    return EMPTY_FRAME;
  }

  const vv = window.visualViewport;
  const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
  const layoutWidth = document.documentElement.clientWidth || window.innerWidth;

  if (!vv) {
    return {
      top: 0,
      height: roundPx(layoutHeight),
      width: roundPx(layoutWidth),
      keyboardInset: 0,
    };
  }

  const top = roundPx(vv.offsetTop);
  const height = roundPx(vv.height);
  const width = roundPx(vv.width);
  const keyboardInset = Math.max(0, roundPx(layoutHeight - vv.height - vv.offsetTop));

  return { top, height, width, keyboardInset };
}

function withLatches(
  raw: Omit<VisualViewportFrame, "isKeyboardOpen" | "isLayoutCompact">
): VisualViewportFrame {
  const signal = Math.max(raw.keyboardInset, raw.top);

  if (openLatched) {
    openLatched = signal > OPEN_EXIT;
  } else {
    openLatched = signal > OPEN_ENTER;
  }

  if (compactLatched) {
    compactLatched = signal > COMPACT_EXIT;
  } else {
    // Prefer true keyboard overlap for compact UI; offsetTop-only pans shouldn't collapse chrome.
    compactLatched = raw.keyboardInset > COMPACT_ENTER || signal > COMPACT_ENTER + 40;
  }

  return {
    ...raw,
    isKeyboardOpen: openLatched,
    isLayoutCompact: compactLatched,
  };
}

function publish(next: VisualViewportFrame) {
  // Geometry listeners always get the latest pixels (DOM writes, no React).
  // React subscribers only wake when latches flip — per-frame height ticks
  // must not re-render GameBoard/Header or the keyboard feels like jelly.
  const latchChanged =
    cachedFrame.isKeyboardOpen !== next.isKeyboardOpen ||
    cachedFrame.isLayoutCompact !== next.isLayoutCompact;
  cachedFrame = next;
  for (const listener of geometryListeners) {
    listener(next);
  }
  if (latchChanged) {
    for (const listener of listeners) {
      listener();
    }
  }
}

function flush() {
  rafId = 0;
  publish(withLatches(measureRaw()));
}

function scheduleFlush() {
  if (rafId !== 0) return;
  rafId = window.requestAnimationFrame(flush);
}

function onFocusIn(e: FocusEvent) {
  const t = e.target;
  if (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    (t instanceof HTMLElement && t.isContentEditable)
  ) {
    scheduleFlush();
    // One late sample after the OSK animation — not a poll storm.
    window.setTimeout(scheduleFlush, 320);
  }
}

function onFocusOut() {
  window.setTimeout(scheduleFlush, 280);
}

function startListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const vv = window.visualViewport;
  vv?.addEventListener("resize", scheduleFlush);
  vv?.addEventListener("scroll", scheduleFlush);
  window.addEventListener("resize", scheduleFlush);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  flush();
}

function stopListening() {
  if (!listening || typeof window === "undefined") return;
  if (listeners.size > 0 || geometryListeners.size > 0) return;
  listening = false;
  const vv = window.visualViewport;
  vv?.removeEventListener("resize", scheduleFlush);
  vv?.removeEventListener("scroll", scheduleFlush);
  window.removeEventListener("resize", scheduleFlush);
  document.removeEventListener("focusin", onFocusIn);
  document.removeEventListener("focusout", onFocusOut);
  if (rafId !== 0) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  startListening();
  return () => {
    listeners.delete(onStoreChange);
    stopListening();
  };
}

/**
 * Subscribe to geometry updates without React re-renders.
 * VisualViewportShell uses this to write top/height on the compositor path.
 */
export function subscribeVisualViewportGeometry(
  onFrame: (frame: VisualViewportFrame) => void
): () => void {
  geometryListeners.add(onFrame);
  startListening();
  onFrame(cachedFrame);
  return () => {
    geometryListeners.delete(onFrame);
    stopListening();
  };
}

export function getVisualViewportFrame(): VisualViewportFrame {
  return cachedFrame;
}

/**
 * Sync layout to the Visual Viewport.
 *
 * On iOS Safari the layout viewport does NOT shrink for the keyboard — the
 * visual viewport pans/resizes instead. Consumers should pin a fixed shell with
 * `top` + `height` from this hook (not `bottom` / translateY alone).
 *
 * Geometry is rAF-coalesced and rounded; structural `isLayoutCompact` uses a
 * higher hysteresis threshold so chrome/puzzle don't thrash mid-animation.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
 */
export function useVisualViewportFrame(): VisualViewportFrame {
  const frame = useSyncExternalStore(
    subscribe,
    () => cachedFrame,
    () => EMPTY_FRAME
  );

  // Soft lock: hide document scroll chrome while the OSK is up.
  // Avoid scrollTo() loops — they fight iOS visual-viewport pan and cause jitter.
  useEffect(() => {
    if (!frame.isKeyboardOpen) return;
    const root = document.documentElement;
    const body = document.body;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      root.style.overflow = prevRootOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [frame.isKeyboardOpen]);

  return frame;
}

/** @deprecated Prefer useVisualViewportFrame — kept for older call sites. */
function useVisualViewport() {
  const frame = useVisualViewportFrame();
  return {
    keyboardHeight: frame.keyboardInset,
    isKeyboardVisible: frame.isLayoutCompact,
    visualViewportHeight: frame.height,
    visualViewportWidth: frame.width,
  };
}

function useIsKeyboardVisible(): boolean {
  return useVisualViewportFrame().isLayoutCompact;
}
