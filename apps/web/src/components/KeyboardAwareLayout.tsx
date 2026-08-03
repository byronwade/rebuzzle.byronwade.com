"use client";

import type { ReactNode } from "react";
import { useVisualViewportFrame } from "@/lib/hooks/useVisualViewport";
import { cn } from "@/lib/utils";

interface KeyboardAwareRenderProps {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  visualViewportHeight: number;
}

interface KeyboardAwareLayoutProps {
  children: (props: KeyboardAwareRenderProps) => ReactNode;
  className?: string;
  /** Kept for API compat — scroll locking lives on the VV frame hook. */
  lockBodyScroll?: boolean;
}

/**
 * Fills the VisualViewportShell and reports keyboard state to children.
 * Height ownership is the shell's job; this is just a flex column + state.
 */
export function KeyboardAwareLayout({ children, className }: KeyboardAwareLayoutProps) {
  const frame = useVisualViewportFrame();

  return (
    <div
      className={cn(
        "keyboard-aware-container flex h-full min-h-0 flex-col overflow-hidden",
        frame.isKeyboardOpen && "keyboard-visible",
        className
      )}
    >
      {children({
        isKeyboardVisible: frame.isKeyboardOpen,
        keyboardHeight: frame.keyboardInset,
        visualViewportHeight: frame.height,
      })}
    </div>
  );
}
