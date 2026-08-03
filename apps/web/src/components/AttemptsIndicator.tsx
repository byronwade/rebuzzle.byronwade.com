"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface AttemptsIndicatorProps {
  /** Current number of attempts used */
  currentAttempts: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Whether to animate the last heart breaking */
  animateOnChange?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Visual heart-based attempts indicator
 * Shows filled hearts for remaining attempts, empty for used
 */
export function AttemptsIndicator({
  currentAttempts,
  maxAttempts,
  animateOnChange = true,
  className,
}: AttemptsIndicatorProps) {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [prevAttempts, setPrevAttempts] = useState(currentAttempts);

  const remainingAttempts = maxAttempts - currentAttempts;
  const isLastAttempt = remainingAttempts === 1;

  // Animate heart break when attempts increase (haptics live on the guess path —
  // keep this visual-only so we don't double-buzz).
  useEffect(() => {
    if (animateOnChange && currentAttempts > prevAttempts) {
      const brokenHeartIndex = maxAttempts - currentAttempts;
      setAnimatingIndex(brokenHeartIndex);

      const timeout = setTimeout(() => {
        setAnimatingIndex(null);
      }, 600);

      setPrevAttempts(currentAttempts);
      return () => clearTimeout(timeout);
    }
    setPrevAttempts(currentAttempts);
  }, [currentAttempts, prevAttempts, maxAttempts, animateOnChange]);

  // One soft warning when the last heart becomes fragile.
  useEffect(() => {
    if (isLastAttempt && currentAttempts > 0) {
      haptics.warning();
    }
  }, [isLastAttempt, currentAttempts]);

  const getTooltipText = () => {
    if (remainingAttempts === 0) return "No attempts remaining";
    if (isLastAttempt) return "Last attempt — make it count";
    return `${remainingAttempts} attempts remaining`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("flex cursor-default items-center gap-2", className)}
            role="status"
            aria-label={`${remainingAttempts} of ${maxAttempts} attempts remaining`}
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: maxAttempts }).map((_, index) => {
                const isFilled = index < remainingAttempts;
                const isAnimating = animatingIndex === index;

                return (
                  <Heart
                    aria-hidden="true"
                    className={cn(
                      "h-3.5 w-3.5 transition-all duration-300",
                      isFilled &&
                        isLastAttempt &&
                        "heart-fragile fill-destructive text-destructive",
                      isFilled && !isLastAttempt && "fill-foreground text-foreground",
                      !isFilled && "fill-transparent text-border-strong/50",
                      isAnimating && "scale-125"
                    )}
                    key={index}
                  />
                );
              })}
            </div>
            <span
              className={cn(
                "font-mono text-xs tabular-nums",
                isLastAttempt ? "text-destructive" : "text-subtle"
              )}
            >
              {remainingAttempts}/{maxAttempts}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{getTooltipText()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
