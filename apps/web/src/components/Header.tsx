"use client";

import { Heart, Info, Menu, X } from "lucide-react";
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
import { useIsClient } from "@/lib/hooks/use-is-client";
import { cn } from "@/lib/utils";
import { AttemptsIndicator } from "./AttemptsIndicator";
import { useAuth } from "./AuthProvider";
import { RebuzzleLogo } from "./brand/RebuzzleLogo";
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

const NAV_LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/achievements", label: "Achievements" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/blog", label: "Blog" },
];

export default function Header({ nextPlayTime, puzzleType, gameState }: HeaderProps) {
  const { isAuthenticated } = useAuth();
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
      <header className="play-chrome sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-header max-w-page items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-7">
            <Link className="transition-opacity hover:opacity-70" href="/">
              <RebuzzleLogo size="md" />
            </Link>

            {/* Desktop site nav */}
            <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  className="rounded-md px-2.5 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              aria-controls={mobileNavId}
              aria-expanded={mobileNavOpen}
              aria-label="Menu"
              className="md:hidden"
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
              <span className="sr-only">Menu</span>
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
          className={cn("border-border border-t md:hidden", mobileNavOpen ? "block" : "hidden")}
          id={mobileNavId}
        >
          <ul className="mx-auto flex max-w-page flex-col gap-0.5 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  className="block rounded-md px-2.5 py-2.5 text-foreground text-sm transition-colors hover:bg-muted"
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status rail — difficulty, countdown and attempts, in the mono voice */}
        <div className="border-border border-t">
          <div className="mx-auto flex h-10 max-w-page items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {isPlaying && gameState?.difficulty !== undefined ? (
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

            {isPlaying && (
              <AttemptsIndicator
                animateOnChange
                currentAttempts={gameState?.currentAttempts ?? 0}
                maxAttempts={gameState?.maxAttempts ?? 3}
              />
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
