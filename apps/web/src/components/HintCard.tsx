"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HintCardProps {
  /** All available hints */
  hints: string[];
  /** Current hint index (how many are revealed, 0 = none) */
  currentIndex: number;
  /** Callback when "Get Hint" is pressed */
  onShowHint: () => void;
  /** Whether more hints can be shown */
  canShowMore: boolean;
  /** Whether the game is complete */
  isComplete?: boolean;
  /** Optional className */
  className?: string;
}

export function HintCard({
  hints,
  currentIndex,
  onShowHint,
  canShowMore,
  isComplete = false,
  className,
}: HintCardProps) {
  if (hints.length === 0) {
    return null;
  }

  const revealedHints = hints.slice(0, currentIndex);
  const hintsRemaining = hints.length - revealedHints.length;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
            Hints
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {revealedHints.length}/{hints.length}
        </span>
      </div>

      {revealedHints.length > 0 ? (
        <div className="space-y-2 mb-3">
          {revealedHints.map((hint, index) => (
            <div
              key={index}
              className="flex gap-2 text-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
            >
              <span className="text-muted-foreground font-semibold min-w-[20px]">
                {index + 1}.
              </span>
              <span className="text-foreground/90">{hint}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic mb-3">
          No hints revealed yet
        </p>
      )}

      {!isComplete && canShowMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={onShowHint}
          className="w-full border-yellow-500/30 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
        >
          <Lightbulb className="h-3.5 w-3.5 mr-2" />
          Get Hint ({hintsRemaining} remaining) · -10 pts
        </Button>
      )}

      {!isComplete && !canShowMore && revealedHints.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          No more hints available
        </p>
      )}
    </div>
  );
}
