"use client";

import { LightbulbIcon, LockIcon, UnlockIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface HintBadgeProps {
  hints: string[];
  className?: string;
  onHintReveal?: (hintIndex: number) => void;
  gameId?: string;
}

export function HintBadge({ hints = [], className, onHintReveal, gameId }: HintBadgeProps) {
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Hint state is now managed in memory only
  // No need to persist hints across sessions

  const handleRevealNextHint = () => {
    if (!hints || hints.length === 0) {
      // Show native notification for no hints (with permission check)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("No hints available", {
          body: "There are no hints available for this puzzle.",
          icon: "/icon-192x192.png",
        });
      }
      return;
    }

    if (revealedHints < hints.length) {
      const newRevealedCount = revealedHints + 1;
      setRevealedHints(newRevealedCount);
      setIsRevealing(true);

      // Hint state is managed in memory only

      // Track hint usage
      trackEvent(analyticsEvents.HINTS_REVEALED, {
        hintNumber: newRevealedCount,
        totalHints: hints.length,
        gameId,
      });

      // Notify parent component
      onHintReveal?.(newRevealedCount - 1);

      // Show native notification for hint reveal (with permission check)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Hint ${newRevealedCount} Revealed`, {
          body: "Using hints will reduce your points for this puzzle.",
          icon: "/icon-192x192.png",
        });
      }

      // Reset revealing state after animation
      setTimeout(() => setIsRevealing(false), 500);
    }
  };

  if (!hints || hints.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Badge
                className={cn(
                  "min-h-[44px] cursor-pointer px-3 py-1.5 text-xs transition-all hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transition-none dark:hover:bg-amber-900/30",
                  "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/50 dark:to-yellow-950/50 dark:border-amber-800",
                  isRevealing && "scale-110 motion-reduce:scale-100",
                  revealedHints === 0 && "animate-pulse",
                  "sm:min-h-0 sm:px-2 sm:py-1",
                  className
                )}
                variant="outline"
              >
                <LightbulbIcon className="mr-1.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline text-amber-700 dark:text-amber-300">
                  Need a Hint? ({hints.length - revealedHints} available)
                </span>
                <span className="sm:hidden text-amber-700 dark:text-amber-300">
                  Hint? ({hints.length - revealedHints})
                </span>
              </Badge>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Stuck? Click to reveal hints (-10 pts each)</TooltipContent>
        </Tooltip>
        <DialogContent className="mx-auto max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-semibold text-base md:text-lg">
              <LightbulbIcon className="h-4 w-4" />
              Need a Hint?
            </DialogTitle>
            <DialogDescription className="text-sm">
              Reveal progressive hints to help solve the puzzle. Using hints will reduce your
              points.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {hints.map((hint, index) => {
              const isRevealed = index < revealedHints;
              const isNext = index === revealedHints;

              return (
                <div
                  className={cn(
                    "rounded-lg border p-3 transition-all duration-300 motion-reduce:transition-none",
                    isRevealed
                      ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                      : "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50",
                    isNext && "border-neutral-300 shadow-sm dark:border-neutral-600",
                    isRevealing &&
                      isRevealed &&
                      index === revealedHints - 1 &&
                      "animate-bounce motion-reduce:animate-none"
                  )}
                  key={index}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Hint {index + 1}</span>
                      {isRevealed ? (
                        <Badge className="px-2 py-0.5 font-medium text-xs" variant="secondary">
                          <UnlockIcon className="mr-1 h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Revealed</span>
                          <span className="sm:hidden">✓</span>
                        </Badge>
                      ) : (
                        <Badge
                          className="px-2 py-0.5 font-medium text-muted-foreground text-xs"
                          variant="outline"
                        >
                          <LockIcon className="mr-1 h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Locked</span>
                          <span className="sm:hidden">🔒</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-sm leading-relaxed transition-all duration-300 motion-reduce:transition-none",
                      isRevealed ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {isRevealed ? hint : "This hint is still locked"}
                  </div>
                </div>
              );
            })}

            {revealedHints < hints.length && (
              <div className="pt-2">
                <Button
                  className="min-h-[44px] w-full border-neutral-300 bg-neutral-100 text-neutral-700 text-sm hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300 dark:hover:bg-neutral-700/50 sm:min-h-0 sm:h-10"
                  onClick={handleRevealNextHint}
                  variant="outline"
                >
                  <LightbulbIcon className="mr-2 h-4 w-4" />
                  Reveal Hint {revealedHints + 1}
                </Button>
                <p className="mt-3 px-2 text-center text-muted-foreground text-xs leading-relaxed">
                  Using hints will reduce your points for this puzzle
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
