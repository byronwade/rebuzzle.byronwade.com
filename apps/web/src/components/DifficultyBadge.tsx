"use client";

import { DIFFICULTY_ACCENTS, getDifficultyDescription, getDifficultyName } from "@/lib/difficulty";
import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  difficulty: number | undefined;
  className?: string;
  size?: "sm" | "md";
  showDescription?: boolean;
}

/**
 * Prominent difficulty tier badge for the play surface.
 */
export function DifficultyBadge({
  difficulty,
  className,
  size = "md",
  showDescription = false,
}: DifficultyBadgeProps) {
  const name = getDifficultyName(difficulty);
  const accents = DIFFICULTY_ACCENTS[name];

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border font-semibold tracking-wide",
          accents.badge,
          accents.glow,
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", accents.dot)} aria-hidden />
        {name}
        {typeof difficulty === "number" ? (
          <span className="opacity-70 font-medium tabular-nums">{difficulty}/10</span>
        ) : null}
      </span>
      {showDescription ? (
        <span className="max-w-[16rem] text-left text-muted-foreground text-xs leading-snug">
          {getDifficultyDescription(name)}
        </span>
      ) : null}
    </div>
  );
}
