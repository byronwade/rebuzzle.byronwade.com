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
  /**
   * Render props pattern - children receive keyboard state
   */
  children: (props: KeyboardAwareRenderProps) => ReactNode;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Whether to apply body scroll lock when mounted
   * @default true on mobile
   */
  lockBodyScroll?: boolean;
}

/**
 * KeyboardAwareLayout - A wrapper component that handles virtual keyboard visibility.
 *
 * Uses the Visual Viewport API to detect when the virtual keyboard is open and
 * provides this state to children via render props.
 *
 * @example
 * ```tsx
 * <KeyboardAwareLayout>
 *   {({ isKeyboardVisible, keyboardHeight }) => (
 *     <div className="flex flex-col h-full">
 *       {isKeyboardVisible ? (
 *         <MinimalPuzzleView />
 *       ) : (
 *         <FullPuzzleView />
 *       )}
 *       <InputArea />
 *     </div>
 *   )}
 * </KeyboardAwareLayout>
 * ```
 */
export function KeyboardAwareLayout({
  children,
  className,
  lockBodyScroll = true,
}: KeyboardAwareLayoutProps) {
  const { isKeyboardVisible, keyboardHeight, visualViewportHeight } = useVisualViewport();
  const containerRef = useRef<HTMLDivElement>(null);

  // Set CSS custom properties for use in child components
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
      containerRef.current.style.setProperty("--visible-height", `${visualViewportHeight}px`);
    }
  }, [keyboardHeight, visualViewportHeight]);

  // Optional body scroll lock on mobile
  useEffect(() => {
    if (!lockBodyScroll) return;

    // Only apply on touch devices
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    // Add class to body to prevent background scroll
    document.body.classList.add("keyboard-layout-active");

    return () => {
      document.body.classList.remove("keyboard-layout-active");
    };
  }, [lockBodyScroll]);

  // Calculate the container height
  // When keyboard is visible, use the visual viewport height
  // Otherwise, use 100dvh (or 100vh as fallback)
  const containerStyle = isKeyboardVisible
    ? { height: `${visualViewportHeight}px` }
    : undefined; // Let CSS handle it with 100dvh

  return (
    <div
      ref={containerRef}
      className={cn(
        "keyboard-aware-container",
        isKeyboardVisible && "keyboard-visible",
        className
      )}
      style={containerStyle}
    >
      {children({
        isKeyboardVisible,
        keyboardHeight,
        visualViewportHeight,
      })}
    </div>
  );
}
