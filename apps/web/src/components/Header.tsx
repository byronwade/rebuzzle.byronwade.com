"use client";

import { Heart, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDifficultyName, getGroupedDailyDifficulties } from "@/lib/difficulty";
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
      <header className="w-full border-border border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo and Navigation - Left aligned */}
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  className="font-semibold text-foreground text-lg transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                  href="/"
                >
                  Rebuzzle
                </Link>
              </TooltipTrigger>
              <TooltipContent>Go to home page</TooltipContent>
            </Tooltip>

            {/* Navigation - Desktop */}
            <nav className="hidden items-center gap-6 md:flex">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    href="/"
                  >
                    Home
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Play today's puzzle</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    href="/leaderboard"
                  >
                    Leaderboards
                  </Link>
                </TooltipTrigger>
                <TooltipContent>View leaderboard rankings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    href="/achievements"
                  >
                    Achievements
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Collect all 100 achievements</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    href="/blog"
                  >
                    Blog
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Read tips and updates</TooltipContent>
              </Tooltip>
            </nav>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label={`Difficulty: ${getDifficultyName(gameState.difficulty)}. Click for more info.`}
                        className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 transition-all duration-200 hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        type="button"
                      >
                        <div
                          aria-hidden="true"
                          className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-sm motion-reduce:animate-none"
                        />
                        <span className="font-medium text-foreground text-sm">
                          {getDifficultyName(gameState.difficulty)}
                        </span>
                        <Info aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Daily Difficulties</h4>
                        <div className="space-y-2">
                          {getGroupedDailyDifficulties().map((difficulty) => {
                            const isCurrentDifficulty = difficulty.levels.includes(
                              gameState.difficulty ?? 0
                            );
                            return (
                              <div
                                className={cn(
                                  "rounded-lg border p-2 text-xs",
                                  isCurrentDifficulty
                                    ? "border-primary bg-primary/10"
                                    : "border-border"
                                )}
                                key={difficulty.name}
                              >
                                <span className="font-medium">{difficulty.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  {difficulty.description}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>Click to see all difficulty levels</TooltipContent>
              </Tooltip>
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
