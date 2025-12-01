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
            "cursor-pointer text-xs xs:text-sm transition-all hover:bg-purple-50",
            isRevealing && "scale-110",
            className
          )}
          variant="outline"
        >
          <LightbulbIcon className="mr-1 h-3 xs:h-4 w-3 xs:w-4" />
          <span className="xs:inline hidden">
            {revealedHints}/{hints.length} Hints
          </span>
          <span className="xs:hidden">
            {revealedHints}/{hints.length}
          </span>
        </Badge>
      </DialogTrigger>
      <DialogContent className="mx-auto max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base xs:text-lg">
            <LightbulbIcon className="h-4 xs:h-5 w-4 xs:w-5" />
            Need a Hint?
          </DialogTitle>
          <DialogDescription>
            Reveal progressive hints to help solve the puzzle. Using hints will
            reduce your points.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 xs:space-y-4 py-2 xs:py-4">
          {hints.map((hint, index) => {
            const isRevealed = index < revealedHints;
            const isNext = index === revealedHints;

            return (
              <div
                className={cn(
                  "rounded-lg border p-3 xs:p-4 transition-all duration-300",
                  isRevealed
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50/50",
                  isNext && "border-purple-200 shadow-sm",
                  isRevealing &&
                    isRevealed &&
                    index === revealedHints - 1 &&
                    "animate-bounce"
                )}
                key={index}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 xs:gap-2">
                    <span className="font-medium text-xs xs:text-sm">
                      Hint {index + 1}
                    </span>
                    {isRevealed ? (
                      <Badge
                        className="px-1 xs:px-2 py-0.5 text-[10px] xs:text-xs"
                        variant="secondary"
                      >
                        <UnlockIcon className="mr-0.5 xs:mr-1 h-2 xs:h-3 w-2 xs:w-3" />
                        <span className="xs:inline hidden">Revealed</span>
                        <span className="xs:hidden">✓</span>
                      </Badge>
                    ) : (
                      <Badge
                        className="px-1 xs:px-2 py-0.5 text-[10px] text-gray-500 xs:text-xs"
                        variant="outline"
                      >
                        <LockIcon className="mr-0.5 xs:mr-1 h-2 xs:h-3 w-2 xs:w-3" />
                        <span className="xs:inline hidden">Locked</span>
                        <span className="xs:hidden">🔒</span>
                      </Badge>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "text-xs xs:text-sm leading-relaxed transition-all duration-300",
                    isRevealed ? "text-gray-700" : "text-gray-400"
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
                className="h-10 xs:h-11 w-full border-purple-200 bg-purple-50 text-purple-700 text-sm xs:text-base hover:bg-purple-100"
                onClick={handleRevealNextHint}
                variant="outline"
              >
                <LightbulbIcon className="mr-1 xs:mr-2 h-3 xs:h-4 w-3 xs:w-4" />
                Reveal Hint {revealedHints + 1}
              </Button>
              <p className="mt-2 xs:mt-3 px-2 text-center text-[10px] text-gray-500 xs:text-xs leading-relaxed">
                Using hints will reduce your points for this puzzle
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
