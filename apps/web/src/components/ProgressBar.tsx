"use client";

import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** Number of correct words */
  correctWords: number;
  /** Total number of words in the answer */
  totalWords: number;
  /** Optional word labels for segments */
  wordLabels?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Segmented progress bar showing word-by-word progress
 */
export function ProgressBar({ correctWords, totalWords, wordLabels, className }: ProgressBarProps) {
  const [prevCorrect, setPrevCorrect] = useState(correctWords);
  const [animatingSegment, setAnimatingSegment] = useState<number | null>(null);

  const progress = totalWords > 0 ? (correctWords / totalWords) * 100 : 0;

  // Animate and haptic when a word becomes correct
  useEffect(() => {
    if (correctWords > prevCorrect) {
      const newCorrectIndex = correctWords - 1;
      setAnimatingSegment(newCorrectIndex);
      haptics.success();

      const timeout = setTimeout(() => {
        setAnimatingSegment(null);
      }, 500);

      setPrevCorrect(correctWords);
      return () => clearTimeout(timeout);
    }
    setPrevCorrect(correctWords);
  }, [correctWords, prevCorrect]);

  const getProgressTooltip = () => {
    if (correctWords === 0) return "Guess words to fill the progress bar";
    if (correctWords === totalWords) return "All words correct!";
    return `${totalWords - correctWords} word${totalWords - correctWords !== 1 ? "s" : ""} remaining`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("w-full space-y-2", className)}>
        {/* Progress label */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Progress</span>
          <span
            className={cn(
              "font-semibold transition-colors",
              correctWords === totalWords ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {correctWords} of {totalWords} words
          </span>
        </div>

        {/* Segmented bar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex h-3 w-full gap-1 rounded-full overflow-hidden cursor-default"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${correctWords} of ${totalWords} words correct`}
            >
              {Array.from({ length: totalWords }).map((_, index) => {
                const isCorrect = index < correctWords;
                const isAnimating = animatingSegment === index;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 transition-all duration-300 rounded-sm",
                      isCorrect ? "bg-green-500" : "bg-neutral-200 dark:bg-neutral-700",
                      isAnimating && "scale-y-125 bg-green-400"
                    )}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent>{getProgressTooltip()}</TooltipContent>
        </Tooltip>

        {/* Optional word labels */}
        {wordLabels && wordLabels.length > 0 && (
          <div className="flex gap-1">
            {wordLabels.map((label, index) => {
              const isCorrect = index < correctWords;
              return (
                <span
                  key={index}
                  className={cn(
                    "flex-1 text-center text-xs truncate px-1",
                    isCorrect ? "text-green-600 font-medium" : "text-muted-foreground"
                  )}
                >
                  {isCorrect ? label : "?".repeat(Math.min(label.length, 8))}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
