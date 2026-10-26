"use client";

import { Clock, Flame } from "lucide-react";
import { usePathname } from "next/navigation";
import { AppLink as Link } from "@/components/AppLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateLevel, gameSettings, getLevelProgress } from "@/lib/gameSettings";
import { usePlayerHud } from "@/lib/player-hud";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { Timer } from "./Timer";

type PlayerHudProps = {
  nextPlayTime: Date | null;
  /** The status rail already shows the countdown while a puzzle is in play. */
  showCountdown: boolean;
  /** Rail variant: full width, countdown always shown. */
  expanded?: boolean;
};

const numberFormat = new Intl.NumberFormat("en-US");

/**
 * The header's heads-up display: streak flame and level with an XP bar for a
 * player with stats, then the next-puzzle countdown as its own segment. Segments
 * share one plate, split by hairlines, like a game HUD.
 */
export function PlayerHud({ nextPlayTime, showCountdown, expanded = false }: PlayerHudProps) {
  const { userId } = useAuth();
  const pathname = usePathname();
  const stats = usePlayerHud(userId, pathname);

  // Timer brings its own "local midnight" tooltip.
  const countdown = showCountdown ? (
    <div
      className={cn(
        "hud-segment",
        expanded
          ? "flex-1"
          : // With stats in view the countdown is a wide-screen extra.
            stats
            ? "hidden 2xl:flex"
            : "hidden sm:flex"
      )}
    >
      <Clock aria-hidden className="size-3.5 text-subtle" />
      <span className="hud-label">Next</span>
      <Timer className="text-xs" compact nextPlayTime={nextPlayTime} />
      <span className="sr-only">until the next puzzle</span>
    </div>
  ) : null;

  if (!stats) {
    // The countdown is the plate's only segment here, and it hides on phones.
    return countdown ? (
      <div className={cn("hud-plate", expanded ? "w-full" : "max-sm:hidden")}>{countdown}</div>
    ) : null;
  }

  const level = calculateLevel(stats.points);
  const progress = getLevelProgress(stats.points);
  const atMax = level >= gameSettings.maxLevel;
  const intoLevel = stats.points - (level - 1) * gameSettings.pointsPerLevel;
  const hasStreak = stats.streak > 0;

  const plate = (
    <div className={cn("hud-plate", expanded && "w-full")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            aria-label={`${stats.streak} day streak, level ${level}, ${numberFormat.format(stats.points)} points. Open profile.`}
            className={cn(
              "flex items-stretch rounded-[7px] focus-ring transition-colors hover:bg-muted",
              expanded && "flex-1"
            )}
            href="/profile"
          >
            <span className="hud-segment" data-active={hasStreak || undefined}>
              <Flame
                aria-hidden
                className={cn(
                  "size-3.5",
                  hasStreak ? "fill-pumpkin/25 text-pumpkin" : "text-subtle"
                )}
              />
              <span className={cn("tabular-nums", hasStreak ? "text-foreground" : "text-subtle")}>
                {stats.streak}
              </span>
            </span>
            <span className={cn("hud-segment", expanded && "flex-1")}>
              <span className="hud-level">LV</span>
              <span className="text-foreground tabular-nums">{level}</span>
              <span aria-hidden className={cn("hud-xp hidden sm:block", expanded && "flex-1")}>
                <span
                  className="hud-xp-fill"
                  style={{ transform: `scaleX(${atMax ? 1 : progress / 100})` }}
                />
              </span>
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          {hasStreak ? `${stats.streak}-day streak · ` : "No streak yet · "}
          {atMax
            ? `Level ${level} (max)`
            : `${numberFormat.format(intoLevel)} / ${numberFormat.format(gameSettings.pointsPerLevel)} XP to level ${level + 1}`}
        </TooltipContent>
      </Tooltip>
      {expanded ? null : countdown}
    </div>
  );

  // The rail is too narrow for one strip: the countdown gets its own plate below.
  if (expanded && countdown) {
    return (
      <div className="flex flex-col gap-2">
        {plate}
        <div className="hud-plate w-full">{countdown}</div>
      </div>
    );
  }

  return plate;
}
