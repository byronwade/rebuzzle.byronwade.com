"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Footer } from "./Footer";
import { GameProvider, useGameContext } from "./GameContext";
import Header from "./Header";

const DevToolsPanel = dynamic(
  () => import("./DevToolsPanel").then((m) => m.DevToolsPanel),
  { ssr: false }
);

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
 * - Atmospheric mesh backdrop (hero scale, top of page only)
 * - Header with navigation
 * - Main content area
 * - Four-column footer on scrolling pages
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
      <LayoutContent
        className={className}
        isGamePage={isGamePage}
        nextPlayTime={nextPlayTime}
        puzzleType={puzzleType}
      >
        {children}
      </LayoutContent>
    </GameProvider>
  );
}

function LayoutContent({
  children,
  nextPlayTime,
  puzzleType,
  className,
  isGamePage = false,
}: LayoutProps) {
  const { gameState } = useGameContext();

  return (
    <div
      className={cn(
        "relative flex flex-col bg-background",
        // Game page: fixed height, no scroll
        isGamePage ? "h-dvh overflow-hidden" : "min-h-screen"
      )}
    >
      {/* Skip to main content link for accessibility */}
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:font-medium focus:text-background focus:text-sm"
        href="#main-content"
      >
        Skip to main content
      </a>

      <AtmosphericBackdrop />

      <Header gameState={gameState} nextPlayTime={nextPlayTime ?? null} puzzleType={puzzleType} />

      <main
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col",
          // Game page: no page scroll — the chat scroller owns overflow.
          isGamePage && "overflow-hidden",
          className
        )}
        id="main-content"
      >
        {children}
      </main>

      {!isGamePage && (
        <div className="relative z-10">
          <Footer />
        </div>
      )}

      {/* Temporary Dev Mode tools — enable in Settings */}
      <DevToolsPanel />
    </div>
  );
}

/**
 * The brand mesh, used once per page at hero scale behind the top band, plus a
 * faint engineered grid. Both sit at very low opacity so the ink stays the
 * loudest thing on the page.
 */
function AtmosphericBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] overflow-hidden"
    >
      <div className="absolute inset-0 grid-texture opacity-[0.5] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] dark:opacity-[0.35]" />
      <div className="absolute -top-56 left-1/2 h-[560px] w-[1100px] -translate-x-1/2">
        <div className="mesh-gradient h-full w-full opacity-[0.14] blur-[80px] motion-safe:animate-mesh-drift dark:opacity-[0.22]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
