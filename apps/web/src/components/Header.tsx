"use client";

import { Heart, Info, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DIFFICULTY_ACCENTS,
  getDifficultyName,
  getGroupedDailyDifficulties,
} from "@/lib/difficulty";
import { GAME_MENU, isMenuItemActive } from "@/lib/game-menu";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { cn } from "@/lib/utils";
import { AttemptsIndicator } from "./AttemptsIndicator";
import { useAuth } from "./AuthProvider";
import { RebuzzleLogo } from "./brand/RebuzzleLogo";
import { InfoButton } from "./InfoButton";
import { NotificationBadge } from "./NotificationBadge";
import { PlayerHud } from "./player-hud-client";
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
  const pathname = usePathname();
  const mounted = useIsClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavId = useId();

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const isPlaying = Boolean(gameState?.isPlaying);

  return (
    <TooltipProvider delayDuration={300}>
      <header className="play-chrome sticky top-0 z-40 w-full bg-background">
        <div className="mx-auto flex h-header max-w-page items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link className="transition-opacity hover:opacity-70" href="/">
              <RebuzzleLogo className="max-sm:[&>span:last-child]:sr-only" size="md" />
            </Link>

            {/* Desktop game menu */}
            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {GAME_MENU.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    aria-current={isMenuItemActive(pathname, item.href) ? "page" : undefined}
                    className="menu-tab"
                    href={item.href}
                    key={item.href}
                  >
                    <Icon aria-hidden className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="touch-targets flex items-center gap-2.5 md:gap-1.5">
            <PlayerHud nextPlayTime={nextPlayTime} showCountdown={!isPlaying} />
            <Button
              aria-controls={mobileNavId}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              className="lg:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {mobileNavOpen ? (
                <X className="h-4 w-4" data-icon="inline-end" />
              ) : (
                <Menu className="h-4 w-4" data-icon="inline-end" />
              )}
            </Button>

            {mounted && <NotificationBadge />}
            <InfoButton puzzleType={puzzleType} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild className="hidden sm:inline-flex" size="icon-sm" variant="ghost">
                  <Link
                    aria-label="Support the developer"
                    href="https://github.com/sponsors/byronwade"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Heart className="h-4 w-4" data-icon="inline-start" />
                    <span className="sr-only">Support the developer</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Support the developer</TooltipContent>
            </Tooltip>

            <div aria-hidden className="mx-1 hidden h-4 w-px bg-border sm:block" />

            <UserMenu isAuthenticated={isAuthenticated} />
          </div>
        </div>

        {/* Mobile nav panel */}
        <nav
          aria-label="Primary mobile"
          className={cn(
            "max-h-[calc(var(--vv-height,100dvh)-var(--header-height)-3rem)] overflow-y-auto overscroll-contain border-border border-t lg:hidden",
            mobileNavOpen ? "block" : "hidden"
          )}
          id={mobileNavId}
        >
          <div className="mx-auto max-w-page px-4 py-4">
            <p className="eyebrow">Game menu</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {GAME_MENU.map((item) => {
                const Icon = item.icon;
                return (
                  <li className="last:odd:col-span-2" key={item.href}>
                    <Link
                      aria-current={isMenuItemActive(pathname, item.href) ? "page" : undefined}
                      className="menu-tile"
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <span className="menu-tile-icon">
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{item.label}</span>
                        <span className="truncate text-muted-foreground text-xs">
                          {item.caption}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 border-border border-t pt-3">
              {isPlaying ? (
                <span />
              ) : (
                <Timer className="text-muted-foreground" nextPlayTime={nextPlayTime} />
              )}
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="/blog"
                onClick={() => setMobileNavOpen(false)}
              >
                Blog
              </Link>
            </div>
          </div>
        </nav>

        {/* Status rail — difficulty, countdown and attempts — only while a puzzle is in play */}
        {isPlaying ? (
          <div className="border-border border-t">
            <div className="mx-auto flex h-10 max-w-page items-center justify-between gap-3 px-4 md:px-6">
              <div className="touch-targets flex min-w-0 items-center gap-3">
                {gameState?.difficulty !== undefined ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label={`Difficulty: ${getDifficultyName(gameState.difficulty)}. Click for tiers.`}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium text-xs focus-ring transition-colors",
                          DIFFICULTY_ACCENTS[getDifficultyName(gameState.difficulty)].badge
                        )}
                        type="button"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            DIFFICULTY_ACCENTS[getDifficultyName(gameState.difficulty)].dot
                          )}
                        />
                        {getDifficultyName(gameState.difficulty)}
                        <Info aria-hidden className="h-3 w-3 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-0">
                      <div className="border-border border-b px-4 py-3">
                        <p className="eyebrow">Difficulty tiers</p>
                        <p className="mt-1.5 text-muted-foreground text-xs leading-5">
                          Every day lands in one band — Hard, Difficult, Evil, or Impossible.
                        </p>
                      </div>
                      <div className="divide-y divide-border">
                        {getGroupedDailyDifficulties().map((difficulty) => {
                          const isCurrent = difficulty.levels.includes(gameState.difficulty ?? 0);
                          return (
                            <div
                              className={cn("px-4 py-3", isCurrent && "bg-inset")}
                              key={difficulty.name}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground text-sm">
                                  {difficulty.name}
                                </span>
                                <span className="font-mono text-subtle text-xs tabular-nums">
                                  {difficulty.levels.join("–")}/10
                                </span>
                              </div>
                              <p className="mt-1 text-muted-foreground text-xs leading-5">
                                {difficulty.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}

                <Timer
                  className="font-mono text-subtle text-xs tabular-nums"
                  nextPlayTime={nextPlayTime}
                />
              </div>

              <AttemptsIndicator
                animateOnChange
                currentAttempts={gameState?.currentAttempts ?? 0}
                maxAttempts={gameState?.maxAttempts ?? 3}
              />
            </div>
          </div>
        ) : null}
      </header>
    </TooltipProvider>
  );
}
