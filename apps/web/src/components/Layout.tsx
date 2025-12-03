"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GameProvider, useGameContext } from "./GameContext";
import Header from "./Header";
import { MobileAppPrompt } from "./MobileAppPrompt";

interface LayoutProps {
  children: ReactNode;
  /** Next puzzle time for countdown display */
  nextPlayTime?: Date | null;
  /** Number of puzzles played today (unused, kept for compatibility) */
  puzzlesPlayedToday?: number;
  /** Current puzzle type for header context */
  puzzleType?: string;
  /** Custom className for main content area */
  className?: string;
  /** Whether this is the game page (no-scroll, fixed height layout) */
  isGamePage?: boolean;
}

/**
 * Main layout component wrapping all pages
 *
 * Provides consistent structure with:
 * - Animated background
 * - Header with navigation
 * - Main content area
 * - Mobile app prompt
 */
export default function Layout({
  children,
  nextPlayTime = null,
  puzzleType,
  className,
  isGamePage = false,
}: LayoutProps) {
  return (
    <GameProvider>
      <LayoutContent nextPlayTime={nextPlayTime} puzzleType={puzzleType} className={className} isGamePage={isGamePage}>
        {children}
      </LayoutContent>
    </GameProvider>
  );
}

function LayoutContent({ children, nextPlayTime, puzzleType, className, isGamePage = false }: LayoutProps) {
  const { gameState } = useGameContext();

  return (
    <div className={cn(
      "relative flex flex-col bg-background",
      // Game page: fixed height, no scroll
      isGamePage ? "h-dvh overflow-hidden" : "min-h-screen"
    )}>
      {/* Skip to main content link for accessibility */}
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        href="#main-content"
      >
        Skip to main content
      </a>

      {/* Animated background */}
      <BackgroundDecoration />

      {/* Header - shrink-0 to keep fixed size */}
      <Header nextPlayTime={nextPlayTime ?? null} puzzleType={puzzleType} gameState={gameState} />

      {/* Main content - flex-1 to fill remaining space */}
      <main
        className={cn(
          "fade-in-up relative z-10 flex-1 animate-in duration-700",
          // Game page: no overflow/scroll
          isGamePage && "overflow-hidden",
          className
        )}
        id="main-content"
      >
        {children}
      </main>

      {/* Mobile app download prompt */}
      <MobileAppPrompt />
    </div>
  );
}

/**
 * Animated background decoration
 */
function BackgroundDecoration() {
  return (
    <div aria-hidden="true" className="absolute inset-0 opacity-30 dark:opacity-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(128,128,128,0.05),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(128,128,128,0.15),rgba(0,0,0,0))]" />
      <div
        className="absolute inset-0 motion-safe:animate-pulse motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(128, 128, 128, 0.1) 1px, transparent 0)",
          backgroundSize: "20px 20px",
          animationDuration: "4s",
        }}
      />
    </div>
  );
}
