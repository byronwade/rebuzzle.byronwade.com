"use client";

import { Lock } from "lucide-react";
import { Timer } from "@/components/Timer";
import { cn } from "@/lib/utils";

interface ChatLockedDockProps {
  success: boolean;
  nextPlayTime?: Date | null;
  className?: string;
}

/**
 * Status-only dock after Eve's closing riff. Results / answer live on the
 * SolveResultCard so there's a single primary CTA in the completion beat.
 */
export function ChatLockedDock({ success, nextPlayTime = null, className }: ChatLockedDockProps) {
  return (
    <div className={cn("play-dock-panel w-full", className)}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3.5">
        <div className="chat-lock-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">
            {success ? "Chat locked · puzzle solved" : "Chat locked · day over"}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            Come back after UTC midnight for tomorrow's puzzle.
          </p>
        </div>
        <Timer
          className="shrink-0 font-mono text-foreground text-xs tabular-nums"
          compact
          nextPlayTime={nextPlayTime}
        />
      </div>
    </div>
  );
}
