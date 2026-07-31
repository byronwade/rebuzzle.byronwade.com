"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DevToolsPanel } from "./DevToolsPanel";
import { GameProvider, useGameContext } from "./GameContext";
import Header from "./Header";

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

      {/* Temporary Dev Mode tools — enable in Settings */}
      <DevToolsPanel />
    </div>
  );
}

/**
 * Play atmosphere — cool mist + soft teal wash (not flat gray).
 */
function BackgroundDecoration() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(45,212,191,0.14),transparent_55%),radial-gradient(90%_60%_at_100%_0%,rgba(14,165,233,0.08),transparent_45%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(190_30%_97%)_100%)] dark:bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(45,212,191,0.12),transparent_55%),linear-gradient(180deg,hsl(var(--background)),hsl(200_20%_8%))]" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2] motion-safe:animate-pulse motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15, 118, 110, 0.12) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          animationDuration: "6s",
        }}
      />
    </div>
  );
}
