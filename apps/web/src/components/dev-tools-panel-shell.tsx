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
import { fail } from "@/lib/fail";

type DevAction = "clear-attempts" | "lock-win" | "lock-lose" | "regenerate";


export function DevToolsPanelShell(props: Record<string, any>) {
  const {
    allowed,
    busy,
    data,
    enabled,
    g,
    gatewayInfo,
    go,
    lockInfo,
    locked,
    onCustom,
    onStorage,
    open,
    refreshStatus,
    res,
    router,
    runAction,
    setAllowed,
    setBusy,
    setEnabled,
    setGatewayInfo,
    setLockInfo,
    setOpen,
    setStatus,
    status,
    sync
  } = props;

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
          {gatewayInfo && (
            <p
              className={cn(
                "rounded-md px-2 py-1.5 font-mono text-[10px]",
                gatewayInfo.includes("NOT CONFIGURED")
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted/60 text-foreground/70"
              )}
            >
              {gatewayInfo}
            </p>
          )}

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
                <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-end" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" data-icon="inline-end" />
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
              <Palette className="h-3.5 w-3.5" data-icon="inline-start" />
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-end" />
              ) : (
                <Unlock className="h-3.5 w-3.5" data-icon="inline-end" />
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
                <Trophy data-icon="inline-start" className="mr-1 h-3 w-3" />
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
            <p
              className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px]"
              role="status"
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );

}
