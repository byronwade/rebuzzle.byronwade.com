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
import { gameSettings, scoringConfig } from "@/lib/gameSettings";
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>How to play</DialogTitle>
            <DialogDescription>
              One puzzle a day, {gameSettings.maxAttempts} guesses to solve it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <ol className="list-outside list-decimal space-y-2 pl-5 text-sm leading-6 marker:text-subtle">
              <li>Work out the word or phrase the puzzle stands for.</li>
              <li>Type your answer and press Enter. Each try uses one guess.</li>
              <li>
                Stuck? Reveal a hint. Each one costs {scoringConfig.hints.penaltyPerHint} points.
              </li>
              <li>A new puzzle unlocks at your local midnight.</li>
            </ol>
            {howToPlay ? (
              <section className="space-y-2 rounded-lg border border-border bg-inset p-4">
                <h3 className="font-medium text-sm">
                  Today’s type: {puzzleConfig?.name ?? "Puzzle"}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">{howToPlay.description}</p>
              </section>
            ) : null}
            <p className="border-border border-t pt-4 text-muted-foreground text-xs leading-5">
              Want a nudge? The bell in the header turns on a daily reminder email, sent around 4 PM
              UTC.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
