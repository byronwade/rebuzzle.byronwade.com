"use client";

import { type ReactNode, useEffect, useRef } from "react";
import {
  getVisualViewportFrame,
  subscribeVisualViewportGeometry,
  useVisualViewportFrame,
} from "@/lib/hooks/useVisualViewport";
import { cn } from "@/lib/utils";

interface VisualViewportShellProps {
  children: ReactNode;
  className?: string;
}

function applyShellGeometry(el: HTMLElement) {
  const frame = getVisualViewportFrame();
  const height = frame.height > 0 ? frame.height : 0;
  const top = frame.top;

  // Prefer transform for the iOS pan offset (compositor-friendly). Height still
  // tracks the visible band. Width stays 100% to avoid sub-pixel horizontal jitter.
  el.style.top = "0px";
  el.style.left = "0px";
  el.style.width = "100%";
  el.style.height = height > 0 ? `${height}px` : "100dvh";
  el.style.transform = top > 0 ? `translate3d(0, ${top}px, 0)` : "none";
  el.style.setProperty("--vv-height", height > 0 ? `${height}px` : "100dvh");
  el.style.setProperty("--vv-top", `${top}px`);
  el.style.setProperty("--keyboard-inset", `${frame.keyboardInset}px`);
}

/**
 * Pins children to the *visual* viewport.
 *
 * Geometry is written directly to the DOM on rAF (no React re-render per VV
 * tick). React only re-renders when keyboard open/compact latches flip.
 *
 * @see https://developer.chrome.com/blog/viewport-resize-behavior
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
 */
export function VisualViewportShell({ children, className }: VisualViewportShellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useVisualViewportFrame();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.position = "fixed";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.willChange = "transform, height";

    applyShellGeometry(el);
    return subscribeVisualViewportGeometry(() => {
      applyShellGeometry(el);
    });
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "visual-viewport-shell flex flex-col overflow-hidden bg-background",
        frame.isLayoutCompact && "keyboard-open",
        className
      )}
      data-keyboard={frame.isLayoutCompact ? "open" : frame.isKeyboardOpen ? "opening" : "closed"}
    >
      {children}
    </div>
  );
}
