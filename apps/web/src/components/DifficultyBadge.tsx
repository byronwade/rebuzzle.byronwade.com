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
    <div className={cn("inline-flex flex-col items-start gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border font-medium",
          accents.badge,
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-[13px]"
        )}
      >
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", accents.dot)} />
        {name}
        {typeof difficulty === "number" ? (
          <span className="font-mono text-[11px] tabular-nums opacity-60">{difficulty}/10</span>
        ) : null}
      </span>
      {showDescription ? (
        <span className="hidden max-w-[18rem] text-balance text-left text-subtle text-xs leading-5 sm:block">
          {getDifficultyDescription(name)}
        </span>
      ) : null}
    </div>
  );
}
