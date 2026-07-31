import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../primitives/tooltip";
import { useHaptics } from "../platform/context";
import { cn } from "../utils/cn";

interface AttemptsIndicatorProps {
  currentAttempts: number;
  maxAttempts: number;
  animateOnChange?: boolean;
  className?: string;
}

export function AttemptsIndicator({
  currentAttempts,
  maxAttempts,
  animateOnChange = true,
  className,
}: AttemptsIndicatorProps) {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [prevAttempts, setPrevAttempts] = useState(currentAttempts);
  const haptics = useHaptics();

  const remainingAttempts = maxAttempts - currentAttempts;
  const isLastAttempt = remainingAttempts === 1;

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
  }, [currentAttempts, prevAttempts, maxAttempts, animateOnChange, haptics]);

  useEffect(() => {
    if (isLastAttempt && currentAttempts > 0) {
      haptics.warning();
    }
  }, [isLastAttempt, currentAttempts, haptics]);

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
