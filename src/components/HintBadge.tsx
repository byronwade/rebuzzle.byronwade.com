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
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface HintBadgeProps {
  hints: string[];
  className?: string;
  onHintReveal?: (hintIndex: number) => void;
  gameId?: string;
}

export function HintBadge({
  hints = [],
  className,
  onHintReveal,
  gameId,
}: HintBadgeProps) {
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
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Badge
          className={cn(
            "min-h-[44px] cursor-pointer px-3 py-1.5 text-xs transition-all hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
            isRevealing && "scale-110 motion-reduce:scale-100",
            "sm:min-h-0 sm:px-2 sm:py-1",
            className
          )}
          variant="outline"
        >
          <LightbulbIcon className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">
            {revealedHints}/{hints.length} Hints
          </span>
          <span className="sm:hidden">
            {revealedHints}/{hints.length}
          </span>
        </Badge>
      </DialogTrigger>
      <DialogContent className="mx-auto max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-base md:text-lg">
            <LightbulbIcon className="h-4 w-4" />
            Need a Hint?
          </DialogTitle>
          <DialogDescription className="text-sm">
            Reveal progressive hints to help solve the puzzle. Using hints will
            reduce your points.
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
                  isNext && "border-purple-200 shadow-sm dark:border-purple-700",
                  isRevealing &&
                    isRevealed &&
                    index === revealedHints - 1 &&
                    "animate-bounce motion-reduce:animate-none"
                )}
                key={index}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      Hint {index + 1}
                    </span>
                    {isRevealed ? (
                      <Badge
                        className="px-2 py-0.5 font-medium text-xs"
                        variant="secondary"
                      >
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
                className="min-h-[44px] w-full border-purple-200 bg-purple-50 text-purple-700 text-sm hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30 sm:min-h-0 sm:h-10"
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
  );
}
