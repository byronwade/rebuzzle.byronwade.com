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


export function useDevToolsPanel(props: any = {}) {

  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [lockInfo, setLockInfo] = useState<string>("");
  const [gatewayInfo, setGatewayInfo] = useState<string>("");

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
      if (!res.ok) {
        setAllowed(false);
        setLockInfo("Sign in as guest or account to use Dev Mode actions");
        setGatewayInfo("");
        return;
      }
      const data = (await res.json()) as {
        allowed?: boolean;
        lock?: { hasAttempt?: boolean; wasSuccessful?: boolean };
        puzzle?: { id?: string; puzzle?: string };
        puzzleDate?: string;
        gateway?: {
          authPath?: string;
          apiKeyPresent?: boolean;
          onVercel?: boolean;
          likelyConfigured?: boolean;
        };
      };
      if (!data.allowed) {
        setAllowed(false);
        setLockInfo("Sign in as guest or account to use Dev Mode actions");
        setGatewayInfo("");
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
      if (data.gateway) {
        const g = data.gateway;
        setGatewayInfo(
          g.likelyConfigured
            ? `AI Gateway · ${g.authPath ?? "?"}${g.apiKeyPresent ? " · key" : ""}${
                g.onVercel ? " · vercel" : ""
              }`
            : "AI Gateway · NOT CONFIGURED — set AI_GATEWAY_API_KEY on Vercel"
        );
      }
    } catch {
      setAllowed(false);
      setLockInfo("Could not reach Dev API");
      setGatewayInfo("");
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
      if (!res.ok) {
        fail((await res.text().catch(() => "")) || "Action failed");
      }
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!data.success) {
        fail(data.error || "Action failed");
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
    }
    setBusy(null);

  };

  const go = (path: string) => {
    router.push(path);
  };

  if (!enabled) return null;

  return {
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
  };
}
