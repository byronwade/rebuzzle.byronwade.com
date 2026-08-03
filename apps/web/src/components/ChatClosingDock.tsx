"use client";

import { MessageTyping } from "@/components/ui/message";
import { cn } from "@/lib/utils";

interface ChatClosingDockProps {
  success: boolean;
  className?: string;
}

/**
 * Fills the post-solve limbo while Eve's closing riff streams —
 * so the answer bar never sits empty and muted.
 */
export function ChatClosingDock({ success, className }: ChatClosingDockProps) {
  return (
    <div className={cn("play-dock-panel w-full", className)}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">Eve is finishing…</p>
          <p className="truncate text-muted-foreground text-xs">
            {success
              ? "One last line — then the day locks."
              : "One last line — then you'll see the answer."}
          </p>
        </div>
        <MessageTyping className="shrink-0" />
      </div>
    </div>
  );
}
