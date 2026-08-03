"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Timer } from "@/components/Timer";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { dailyReminderOptInCta, PUZZLE_PUBLISH_COPY } from "@/lib/game/reminder-copy";
import { cn } from "@/lib/utils";

interface ChatLockedDockProps {
  success: boolean;
  nextPlayTime?: Date | null;
  className?: string;
}

const NUDGE_DISMISS_KEY = "rebuzzleEmailNudgeDismissed";

/**
 * Status-only dock after Eve's closing riff. Quiet habit cue — never a hard sell.
 */
export function ChatLockedDock({ success, nextPlayTime = null, className }: ChatLockedDockProps) {
  const { isAuthenticated, user } = useAuth();
  const { enabled: notificationsEnabled, isLoading, subscribe } = useEmailNotifications();
  const [showNudge, setShowNudge] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (isLoading || notificationsEnabled) {
      setShowNudge(false);
      return;
    }
    try {
      if (localStorage.getItem(NUDGE_DISMISS_KEY) === "1") {
        setShowNudge(false);
        return;
      }
    } catch {
      // ignore
    }
    setShowNudge(true);
  }, [isLoading, notificationsEnabled]);

  const dismissNudge = () => {
    try {
      localStorage.setItem(NUDGE_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setShowNudge(false);
  };

  const handleOptIn = async () => {
    if (!isAuthenticated || !user?.email || subscribing) return;
    setSubscribing(true);
    try {
      await subscribe(user.email);
      dismissNudge();
    } catch {
      // hook surfaces error
    } finally {
      setSubscribing(false);
    }
  };

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
          {showNudge ? (
            <p className="truncate text-muted-foreground text-xs">
              {isAuthenticated && user?.email ? (
                <button
                  className="text-foreground underline-offset-2 hover:underline disabled:opacity-60"
                  disabled={subscribing}
                  onClick={() => void handleOptIn()}
                  type="button"
                >
                  {subscribing ? "Saving…" : dailyReminderOptInCta()}
                </button>
              ) : (
                <a
                  className="text-foreground underline-offset-2 hover:underline"
                  href="/settings"
                  onClick={dismissNudge}
                >
                  {dailyReminderOptInCta()}
                </a>
              )}
              <span className="text-subtle"> · </span>
              <button
                className="text-subtle underline-offset-2 hover:underline"
                onClick={dismissNudge}
                type="button"
              >
                Not now
              </button>
            </p>
          ) : (
            <p className="truncate text-muted-foreground text-xs">
              Next puzzle after {PUZZLE_PUBLISH_COPY}.
            </p>
          )}
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
