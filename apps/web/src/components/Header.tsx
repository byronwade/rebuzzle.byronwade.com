"use client";

import { Heart, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DIFFICULTY_ACCENTS, getDifficultyName, getGroupedDailyDifficulties } from "@/lib/difficulty";
import { cn } from "@/lib/utils";
import { AttemptsIndicator } from "./AttemptsIndicator";
import { useAuth } from "./AuthProvider";
import { InfoButton } from "./InfoButton";
import { NotificationBadge } from "./NotificationBadge";
import { Timer } from "./Timer";
import { UserMenu } from "./UserMenu";

interface GameStateContext {
  difficulty: number | undefined;
  currentAttempts: number;
  maxAttempts: number;
  isPlaying: boolean;
}

type HeaderProps = {
  nextPlayTime: Date | null;
  puzzleType?: string;
  gameState?: GameStateContext;
};

export default function Header({ nextPlayTime, puzzleType, gameState }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-side state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <header className="play-chrome w-full border-border/60 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  className="font-bold text-foreground text-xl tracking-tight transition-colors hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-2 dark:hover:text-teal-300"
                  href="/"
                >
                  Rebuzzle
                </Link>
              </TooltipTrigger>
              <TooltipContent>Today&apos;s puzzle</TooltipContent>
            </Tooltip>

            {/* Keep marketing nav off the play surface — app-like focus */}
            {!gameState?.isPlaying && (
              <nav className="hidden items-center gap-6 md:flex">
                <Link
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href="/leaderboard"
                >
                  Leaderboards
                </Link>
                <Link
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href="/achievements"
                >
                  Achievements
                </Link>
                <Link
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href="/blog"
                >
                  Blog
                </Link>
              </nav>
            )}
          </div>

          {/* Actions - Gamified Header Bar */}
          <div className="flex items-center gap-1">
            {/* Icon Actions Group */}
            <div className="flex items-center rounded-full bg-muted/50 p-1">
              {mounted && <NotificationBadge />}
              <InfoButton puzzleType={puzzleType} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    className="h-9 w-9 rounded-full text-muted-foreground transition-all hover:scale-105 hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-900/30 dark:hover:text-pink-400"
                    size="icon"
                    variant="ghost"
                  >
                    <Link
                      href="https://github.com/sponsors/byronwade"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Heart className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Support the developer</TooltipContent>
              </Tooltip>
            </div>

            {/* User Menu - Prominent with gamification */}
            <UserMenu isAuthenticated={isAuthenticated} />
          </div>
        </div>

        {/* Game status bar - shows difficulty, timer, and attempts when playing */}
        <div className="mx-auto flex max-w-4xl items-center justify-between border-border border-t px-4 py-2 md:px-6">
          {/* Left side: Difficulty (when playing) + Timer */}
          <div className="flex items-center gap-3">
            {gameState?.isPlaying && gameState?.difficulty !== undefined ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label={`Difficulty: ${getDifficultyName(gameState.difficulty)}. Click for tiers.`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      DIFFICULTY_ACCENTS[getDifficultyName(gameState.difficulty)].badge
                    )}
                    type="button"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-2 w-2 animate-pulse rounded-full motion-reduce:animate-none",
                        DIFFICULTY_ACCENTS[getDifficultyName(gameState.difficulty)].dot
                      )}
                    />
                    {getDifficultyName(gameState.difficulty)}
                    <Info aria-hidden className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Difficulty tiers</h4>
                    <p className="text-muted-foreground text-xs">
                      Every day lands in one band — Hard, Difficult, Evil, or Impossible.
                    </p>
                    <div className="space-y-2">
                      {getGroupedDailyDifficulties().map((difficulty) => {
                        const isCurrent = difficulty.levels.includes(gameState.difficulty ?? 0);
                        return (
                          <div
                            className={cn(
                              "rounded-xl border p-2.5 text-xs",
                              isCurrent ? difficulty.accentClass : "border-border"
                            )}
                            key={difficulty.name}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{difficulty.name}</span>
                              <span className="tabular-nums opacity-70">
                                {difficulty.levels.join("–")}/10
                              </span>
                            </div>
                            <p className="mt-1 opacity-80">{difficulty.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

            <Timer className="text-muted-foreground text-sm" nextPlayTime={nextPlayTime} />
          </div>

          {/* Right side: Attempts indicator (when playing) */}
          {gameState?.isPlaying && (
            <AttemptsIndicator
              currentAttempts={gameState?.currentAttempts ?? 0}
              maxAttempts={gameState?.maxAttempts ?? 3}
              animateOnChange={false}
            />
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
