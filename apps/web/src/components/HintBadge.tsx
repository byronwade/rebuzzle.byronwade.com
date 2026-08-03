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
                  "min-h-[36px] cursor-pointer px-3 text-xs outline-none transition-colors hover:bg-warning/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
                  isRevealing && "scale-105 motion-reduce:scale-100",
                  "sm:min-h-0 sm:py-1",
                  className
                )}
                variant="warning"
              >
                <LightbulbIcon data-icon="inline-start" className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Need a hint? ({hints.length - revealedHints} left)
                </span>
                <span className="sm:hidden">Hint ({hints.length - revealedHints})</span>
              </Badge>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Stuck? Click to reveal hints (-10 pts each)</TooltipContent>
        </Tooltip>
        <DialogContent className="mx-auto max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LightbulbIcon className="h-4 w-4 text-warning" />
              Need a hint?
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
                    "rounded-lg border p-3 transition-colors duration-300 motion-reduce:transition-none",
                    isRevealed ? "border-border bg-card" : "border-border bg-inset",
                    isNext && "border-border-strong/50"
                  )}
                  key={hint}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-subtle uppercase tracking-[0.08em]">
                        Hint {index + 1}
                      </span>
                      {isRevealed ? (
                        <Badge variant="secondary">
                          <UnlockIcon className="h-3 w-3" />
                          <span className="hidden sm:inline">Revealed</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <LockIcon className="h-3 w-3" />
                          <span className="hidden sm:inline">Locked</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-sm leading-relaxed transition-[opacity,transform,colors] duration-300 motion-reduce:transition-none",
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
                  className="w-full"
                  onClick={handleRevealNextHint}
                  size="lg"
                  variant="outline"
                >
                  <LightbulbIcon className="h-4 w-4" data-icon="inline-start" />
                  Reveal hint {revealedHints + 1}
                </Button>
                <p className="mt-3 px-2 text-center text-subtle text-xs leading-relaxed">
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
