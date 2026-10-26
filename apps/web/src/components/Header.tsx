"use client";

import { Info } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DIFFICULTY_ACCENTS,
  getDifficultyName,
  getGroupedDailyDifficulties,
} from "@/lib/difficulty";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
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

/**
 * No site header. On phones a slim HUD strip (mark, stats, bell, help,
 * avatar) sits over the page, like the resource bar in a mobile game; on
 * desktop the left game rail carries all of that. While a puzzle is in play
 * the in-game status rail (difficulty, countdown, hearts) shows at every size.
 */
export default function Header({ nextPlayTime, puzzleType, gameState }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const mounted = useIsClient();

  const isPlaying = Boolean(gameState?.isPlaying);

  return (
    <TooltipProvider delayDuration={300}>
      <header
        className={cn(
          "play-chrome sticky top-0 z-40 w-full bg-background",
          // Desktop has nothing to show here until a puzzle is in play.
          !isPlaying && "lg:hidden"
        )}
      >
        <div className="flex h-header items-center justify-between gap-3 px-4 md:px-6 lg:hidden">
          <Link aria-label="Rebuzzle home" className="transition-opacity hover:opacity-70" href="/">
            <RebuzzleLogo showWordmark={false} size="md" />
          </Link>

          <div className="touch-targets flex items-center gap-2.5">
            <PlayerHud nextPlayTime={nextPlayTime} showCountdown={!isPlaying} />
            {mounted && !isDesktop ? <NotificationBadge /> : null}
            <InfoButton puzzleType={puzzleType} />
            <UserMenu isAuthenticated={isAuthenticated} />
          </div>
        </div>

        {/* Status rail — difficulty, countdown and attempts — only while a puzzle is in play */}
        {isPlaying ? (
          <div className="border-border border-t lg:border-t-0">
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

              <div className="flex items-center gap-2">
                <AttemptsIndicator
                  animateOnChange
                  currentAttempts={gameState?.currentAttempts ?? 0}
                  maxAttempts={gameState?.maxAttempts ?? 3}
                />
                {/* Phones have help in the HUD strip above. */}
                {isDesktop ? <InfoButton puzzleType={puzzleType} /> : null}
              </div>
            </div>
          </div>
        ) : null}
      </header>
    </TooltipProvider>
  );
}
