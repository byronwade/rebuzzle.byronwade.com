"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { getPuzzleTypeConfig } from "@/ai/config/puzzle-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InfoButtonProps {
  puzzleType?: string;
}

export function InfoButton({ puzzleType }: InfoButtonProps) {
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Check if we're on a mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Get puzzle-specific config if puzzleType is provided
  let puzzleConfig = null;
  if (puzzleType) {
    try {
      puzzleConfig = getPuzzleTypeConfig(puzzleType);
    } catch (error) {
      // Config not found, will use fallback
      console.warn(`Puzzle type config not found for: ${puzzleType}`);
    }
  }

  const howToPlay = puzzleConfig?.howToPlay;

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="Show game instructions and information"
        className="relative"
        onClick={() => setShowInfoDialog(true)}
        size="icon"
        variant="ghost"
      >
        <Info aria-hidden="true" className="h-5 w-5" />
      </Button>

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
                <p className="text-muted-foreground text-sm">
                  {howToPlay.description}
                </p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Rules:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {howToPlay.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
                {howToPlay.examples && howToPlay.examples.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Examples:</h4>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                      {howToPlay.examples.map((example, index) => (
                        <li key={index}>{example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  Rebuzzle is a daily puzzle game that challenges you to solve
                  various types of brain teasers.
                </p>
                <div className="space-y-2">
                  <h4 className="font-semibold">General Rules:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>You have unlimited attempts to solve the puzzle</li>
                    <li>
                      Use hints if you're stuck - they guide you progressively
                    </li>
                    <li>A new puzzle is available each day at 8 AM</li>
                    <li>
                      Each puzzle type has its own unique solving approach
                    </li>
                  </ul>
                </div>
              </>
            )}
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-xs">
                A new puzzle is available each day at 8 AM. Use the notification
                bell in the header to get daily reminders.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
