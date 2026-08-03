"use client";

import { Info } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { getPuzzleTypeConfig } from "@/ai/config/puzzle-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsClient } from "@/lib/hooks/use-is-client";

interface InfoButtonProps {
  puzzleType?: string;
}

function subscribeMobile(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getIsMobile() {
  return window.innerWidth <= 768;
}

export function InfoButton({ puzzleType }: InfoButtonProps) {
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const isMounted = useIsClient();
  const _isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, () => false);

  // Get puzzle-specific config if puzzleType is provided
  let puzzleConfig = null;
  if (puzzleType) {
    try {
      puzzleConfig = getPuzzleTypeConfig(puzzleType);
    } catch (_error) {
      // Config not found, will use fallback
      console.warn(`Puzzle type config not found for: ${puzzleType}`);
    }
  }

  const howToPlay = puzzleConfig?.howToPlay;

  if (!isMounted) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Show game instructions and information"
            className="relative text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setShowInfoDialog(true)}
            size="icon"
            variant="ghost"
          >
            <Info aria-hidden="true" className="h-5 w-5" data-icon="inline-end" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>How to play</TooltipContent>
      </Tooltip>

      <Dialog
        onOpenChange={(open) => {
          setShowInfoDialog(open);
          // Mark as seen when dialog is closed (even if not subscribed)
          if (!open) {
            localStorage.setItem("notification_prompt_seen", "true");
          }
        }}
        open={showInfoDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>How to Play</DialogTitle>
            <DialogDescription>
              {howToPlay
                ? `Learn how to play ${puzzleConfig?.name || "this puzzle"}`
                : "Learn how to play Rebuzzle"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {howToPlay ? (
              <>
                <p className="text-muted-foreground text-sm">{howToPlay.description}</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Rules:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {howToPlay.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
                {howToPlay.examples && howToPlay.examples.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Examples:</h4>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                      {howToPlay.examples.map((example) => (
                        <li key={example}>{example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  Rebuzzle is a daily puzzle game that challenges you to solve various types of
                  brain teasers.
                </p>
                <div className="space-y-2">
                  <h4 className="font-semibold">General Rules:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>You have unlimited attempts to solve the puzzle</li>
                    <li>Use hints if you're stuck - they guide you progressively</li>
                    <li>A new puzzle publishes each day at UTC midnight</li>
                    <li>Each puzzle type has its own unique solving approach</li>
                  </ul>
                </div>
              </>
            )}
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-xs">
                A new puzzle publishes each day at UTC midnight. Email reminders go out around 4 PM
                UTC. Use the notification bell in the header to get daily reminders.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
