"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useVisualViewport } from "@/lib/hooks/useVisualViewport";
import { cn } from "@/lib/utils";

interface KeyboardAwareRenderProps {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  visualViewportHeight: number;
}

interface KeyboardAwareLayoutProps {
  children: (props: KeyboardAwareRenderProps) => ReactNode;
  className?: string;
  /** @default true on touch devices */
  lockBodyScroll?: boolean;
}

/**
 * Fills the game shell and shrinks to the visual viewport when the keyboard opens.
 */
export function KeyboardAwareLayout({
  children,
  className,
  lockBodyScroll = true,
}: KeyboardAwareLayoutProps) {
  const { isKeyboardVisible, keyboardHeight, visualViewportHeight } = useVisualViewport();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    containerRef.current.style.setProperty("--visible-height", `${visualViewportHeight}px`);
  }, [keyboardHeight, visualViewportHeight]);

  useEffect(() => {
    if (!lockBodyScroll) return;
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    document.body.classList.add("keyboard-layout-active");
    return () => {
      document.body.classList.remove("keyboard-layout-active");
    };
  }, [lockBodyScroll]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "keyboard-aware-container flex h-full min-h-0 flex-col overflow-hidden",
        isKeyboardVisible && "keyboard-visible",
        className
      )}
      style={
        isKeyboardVisible && visualViewportHeight > 0
          ? { height: `${visualViewportHeight}px`, maxHeight: `${visualViewportHeight}px` }
          : undefined
      }
    >
      {children({
        isKeyboardVisible,
        keyboardHeight,
        visualViewportHeight,
      })}
    </div>
  );
}
