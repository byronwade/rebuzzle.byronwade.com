"use client";

import type { CSSProperties, ReactNode } from "react";
import { useVisualViewportFrame } from "@/lib/hooks/useVisualViewport";
import { cn } from "@/lib/utils";

interface VisualViewportShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Pins children to the *visual* viewport (top + height).
 *
 * This is the reliable keyboard pattern on iOS Safari / Android Chrome:
 * don't shrink a relative h-dvh box — mirror visualViewport.offsetTop/height
 * onto a position:fixed shell so the puzzle + input stay in the visible band
 * above the keyboard without blank gaps from viewport pan.
 *
 * @see https://developer.chrome.com/blog/viewport-resize-behavior
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
 */
export function VisualViewportShell({ children, className }: VisualViewportShellProps) {
  const frame = useVisualViewportFrame();

  const style: CSSProperties = {
    position: "fixed",
    left: 0,
    width: frame.width > 0 ? `${frame.width}px` : "100%",
    top: `${frame.top}px`,
    height: frame.height > 0 ? `${frame.height}px` : "100dvh",
    // Expose for children / CSS
    ["--vv-height" as string]: `${frame.height || 0}px`,
    ["--vv-top" as string]: `${frame.top}px`,
    ["--keyboard-inset" as string]: `${frame.keyboardInset}px`,
  };

  return (
    <div
      className={cn(
        "visual-viewport-shell flex flex-col overflow-hidden bg-background",
        frame.isKeyboardOpen && "keyboard-open",
        className
      )}
      data-keyboard={frame.isKeyboardOpen ? "open" : "closed"}
      style={style}
    >
      {children}
    </div>
  );
}
