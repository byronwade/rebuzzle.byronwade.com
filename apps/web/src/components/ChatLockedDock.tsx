"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatLockedDockProps {
  success: boolean;
  resultsHref: string;
  className?: string;
}

/**
 * Replaces the answer bar once the day is locked and Eve's closing
 * riff has landed (or timed out), so the conversation clearly ends.
 */
export function ChatLockedDock({ success, resultsHref, className }: ChatLockedDockProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">
            {success ? "Chat locked · puzzle solved" : "Chat locked · day over"}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            Come back after UTC midnight for tomorrow’s puzzle.
          </p>
        </div>
        <Button asChild className="shrink-0" size="sm" variant="outline">
          <Link href={resultsHref}>{success ? "Results" : "Answer"}</Link>
        </Button>
      </div>
    </div>
  );
}
