"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect } from "react";
import { clearDocumentScrollLock } from "@/lib/document-scroll-lock";
import { cn } from "@/lib/utils";
import { Footer } from "./Footer";
import { GameProvider, useGameContext } from "./GameContext";
import Header from "./Header";
import { SyncTimezoneCookie } from "./SyncTimezoneCookie";
import { VisualViewportShell } from "./VisualViewportShell";

const DevToolsPanel = dynamic(() => import("./DevToolsPanel").then((m) => m.DevToolsPanel), {
  ssr: false,
});

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
 * - Header with navigation
 * - Main content area
 * - Four-column footer on scrolling pages
 *
 * Game pages pin to the Visual Viewport so iOS/Android keyboards don't
 * shove the puzzle off-screen.
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

  useEffect(() => {
    if (isGamePage) return;
    clearDocumentScrollLock();
  }, [isGamePage]);

  const chrome = (
    <>
      {/* The skip link lives once, in the root layout, targeting #main-content. */}
      <Header gameState={gameState} nextPlayTime={nextPlayTime ?? null} puzzleType={puzzleType} />

      <main
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col",
          isGamePage && "overflow-hidden",
          className
        )}
        id="main-content"
      >
        {children}
      </main>

      {!isGamePage ? (
        <div className="relative z-10">
          <Footer />
        </div>
      ) : null}

      <SyncTimezoneCookie />
      <DevToolsPanel />
    </>
  );

  if (isGamePage) {
    return <VisualViewportShell className="game-vv-shell">{chrome}</VisualViewportShell>;
  }

  return <div className="relative flex min-h-screen flex-col bg-background">{chrome}</div>;
}
