"use client";

/**
 * Temporary floating Dev Mode panel.
 * Enable via Settings → Dev Mode. Server actions require a signed-in user (guest OK).
 */

import {
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Loader2,
  Palette,
  RefreshCw,
  Trophy,
  Unlock,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearDevClientGameState,
  DEV_MODE_STORAGE_KEY,
  isDevModeEnabled,
  setDevModeEnabled,
} from "@/lib/dev-mode";
import { cn } from "@/lib/utils";

type DevAction = "clear-attempts" | "lock-win" | "lock-lose" | "regenerate";

export function DevToolsPanel() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [lockInfo, setLockInfo] = useState<string>("");

  useEffect(() => {
    const sync = () => setEnabled(isDevModeEnabled());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEV_MODE_STORAGE_KEY || e.key === null) sync();
    };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("rebuzzle:dev-mode", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rebuzzle:dev-mode", onCustom);
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/session", { credentials: "include" });
      const data = (await res.json()) as {
        allowed?: boolean;
        lock?: { hasAttempt?: boolean; wasSuccessful?: boolean };
        puzzle?: { id?: string; puzzle?: string };
        puzzleDate?: string;
      };
      if (!res.ok || !data.allowed) {
        setAllowed(false);
        setLockInfo("Sign in as guest or account to use Dev Mode actions");
        return;
      }
      setAllowed(true);
      const locked = data.lock?.hasAttempt
        ? data.lock.wasSuccessful
          ? "LOCKED · win"
          : "LOCKED · loss"
        : "UNLOCKED · can play";
      setLockInfo(
        `${data.puzzleDate ?? "today"} · ${locked}${
          data.puzzle?.id ? ` · ${data.puzzle.id.slice(0, 8)}…` : " · no puzzle"
        }`
      );
    } catch {
      setAllowed(false);
      setLockInfo("Could not reach Dev API");
    }
  }, []);

  useEffect(() => {
    if (enabled) void refreshStatus();
  }, [enabled, refreshStatus]);

  const runAction = async (action: DevAction, thenNavigate?: string) => {
    setBusy(action);
    setStatus("");
    try {
      const res = await fetch("/api/dev/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Action failed");
      }
      clearDevClientGameState();
      setStatus(data.message || "Done");
      await refreshStatus();
      if (thenNavigate) {
        router.push(thenNavigate);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const go = (path: string) => {
    router.push(path);
  };

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-3 right-3 z-[80] w-[min(100vw-1.5rem,20rem)]",
        "rounded-xl border border-amber-500/40 bg-background/95 shadow-xl backdrop-blur-md"
      )}
    >
      <div className="flex items-center gap-2 border-b border-amber-500/30 px-3 py-2">
        <FlaskConical className="h-4 w-4 text-amber-600" />
        <span className="flex-1 font-semibold text-amber-800 text-xs dark:text-amber-300">
          Dev Mode
        </span>
        <button
          aria-label={open ? "Collapse" : "Expand"}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        <button
          aria-label="Turn off Dev Mode"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={() => {
            setDevModeEnabled(false);
            setEnabled(false);
          }}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="space-y-3 p-3 text-xs">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Temporary testing tools for signed-in users (including guests). Turn off when done.
          </p>
          <p className="rounded-md bg-muted/80 px-2 py-1.5 font-mono text-[10px] text-foreground/80">
            {lockInfo || (allowed === null ? "Checking access…" : "—")}
          </p>

          {allowed === false && (
            <p className="text-destructive text-[11px]">
              Play as guest or sign in, then refresh to use these actions.
            </p>
          )}

          <div className="space-y-1.5">
            <p className="font-medium text-[10px] uppercase tracking-wide text-muted-foreground">
              Puzzle
            </p>
            <Button
              className="h-8 w-full justify-start gap-2 text-xs"
              disabled={!!busy || allowed === false}
              onClick={() => void runAction("regenerate", "/")}
              size="sm"
              variant="secondary"
            >
              {busy === "regenerate" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Generate new puzzle
            </Button>
            <Button
              className="h-8 w-full justify-start gap-2 border-amber-500/30 text-xs"
              disabled={!!busy}
              onClick={() => go("/dev/visual-lab")}
              size="sm"
              variant="outline"
            >
              <Palette className="h-3.5 w-3.5" />
              Visual Lab (pictogram / text / image)
            </Button>
            <Button
              className="h-8 w-full justify-start gap-2 text-xs"
              disabled={!!busy || allowed === false}
              onClick={() => void runAction("clear-attempts", "/")}
              size="sm"
              variant="outline"
            >
              {busy === "clear-attempts" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}
              Unlock today (clear lock)
            </Button>
          </div>

          <div className="space-y-1.5">
            <p className="font-medium text-[10px] uppercase tracking-wide text-muted-foreground">
              Gate states
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                className="h-8 text-[11px]"
                disabled={!!busy || allowed === false}
                onClick={() => void runAction("clear-attempts", "/")}
                size="sm"
                variant="outline"
              >
                → Play
              </Button>
              <Button
                className="h-8 text-[11px]"
                disabled={!!busy || allowed === false}
                onClick={() => void runAction("lock-win", "/")}
                size="sm"
                variant="outline"
              >
                → Locked
              </Button>
              <Button
                className="h-8 text-[11px]"
                disabled={!!busy || allowed === false}
                onClick={() => void runAction("lock-win", "/game-over?success=true")}
                size="sm"
                variant="outline"
              >
                <Trophy className="mr-1 h-3 w-3" />
                Win
              </Button>
              <Button
                className="h-8 text-[11px]"
                disabled={!!busy || allowed === false}
                onClick={() => void runAction("lock-lose", "/game-over?success=false")}
                size="sm"
                variant="outline"
              >
                Lose
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="font-medium text-[10px] uppercase tracking-wide text-muted-foreground">
              Jump
            </p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["/", "Home"],
                  ["/?preview=true", "Preview"],
                  ["/dev/visual-lab", "Visual Lab"],
                  ["/game-over", "Game over"],
                  ["/leaderboard", "Board"],
                  ["/settings", "Settings"],
                  ["/how-it-works", "How"],
                ] as const
              ).map(([href, label]) => (
                <Button
                  key={href}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => go(href)}
                  size="sm"
                  variant="ghost"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {status && (
            <p className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px]">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
