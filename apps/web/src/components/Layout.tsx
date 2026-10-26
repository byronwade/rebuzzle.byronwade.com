"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect } from "react";
import { clearDocumentScrollLock } from "@/lib/document-scroll-lock";
import { cn } from "@/lib/utils";
import { GameProvider, useGameContext } from "./GameContext";
import { GameRail } from "./game-rail-client";
import { GameTabBar } from "./game-tab-bar-client";
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
 * Game chrome instead of site chrome, no header nav and no footer:
 * - Desktop: the left game rail (modes, player HUD, small print)
 * - Phones: a slim HUD strip on top and a tab bar at the bottom
 * - In play: the status rail (difficulty, countdown, hearts) over the board
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

  const isPlaying = Boolean(gameState?.isPlaying);

  const chrome = (
    <div className="flex min-h-0 flex-1">
      <GameRail isPlaying={isPlaying} nextPlayTime={nextPlayTime ?? null} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The skip link lives once, in the root layout, targeting #main-content. */}
        <Header gameState={gameState} nextPlayTime={nextPlayTime ?? null} puzzleType={puzzleType} />

        <main
          className={cn(
            "relative z-10 flex min-h-0 flex-1 flex-col",
            // `mx-auto` page wrappers opt out of flex stretch, so without this they
            // size to their content: narrow pages shrink and wide content overflows.
            "[&>*]:w-full",
            isGamePage && "overflow-hidden",
            className
          )}
          id="main-content"
        >
          {children}
        </main>

        <GameTabBar />
      </div>

      <SyncTimezoneCookie />
      <DevToolsPanel />
    </div>
  );

  if (isGamePage) {
    return <VisualViewportShell className="game-vv-shell">{chrome}</VisualViewportShell>;
  }

  return <div className="relative flex min-h-screen flex-col bg-background">{chrome}</div>;
}
