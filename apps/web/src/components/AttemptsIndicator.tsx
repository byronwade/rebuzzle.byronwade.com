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

  // Animate heart break when attempts increase
  useEffect(() => {
    if (animateOnChange && currentAttempts > prevAttempts) {
      const brokenHeartIndex = maxAttempts - currentAttempts;
      setAnimatingIndex(brokenHeartIndex);
      haptics.error();

      const timeout = setTimeout(() => {
        setAnimatingIndex(null);
      }, 600);

      setPrevAttempts(currentAttempts);
      return () => clearTimeout(timeout);
    }
    setPrevAttempts(currentAttempts);
  }, [currentAttempts, prevAttempts, maxAttempts, animateOnChange]);

  // Warning haptic on last attempt
  useEffect(() => {
    if (isLastAttempt && currentAttempts > 0) {
      haptics.warning();
    }
  }, [isLastAttempt, currentAttempts]);

  const getTooltipText = () => {
    if (remainingAttempts === 0) return "No attempts remaining";
    if (isLastAttempt) return "Last attempt! Be careful";
    return `${remainingAttempts} attempts remaining`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 cursor-default",
              isLastAttempt && "animate-pulse",
              className
            )}
            role="status"
            aria-label={`${remainingAttempts} of ${maxAttempts} attempts remaining`}
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: maxAttempts }).map((_, index) => {
                const isFilled = index < remainingAttempts;
                const isAnimating = animatingIndex === index;

                return (
                  <Heart
                    key={index}
                    className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isFilled
                        ? "fill-red-500 text-red-500"
                        : "fill-transparent text-neutral-300 dark:text-neutral-600",
                      isAnimating && "animate-heartbreak scale-125",
                      isLastAttempt && isFilled && "animate-pulse"
                    )}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                isLastAttempt ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
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
