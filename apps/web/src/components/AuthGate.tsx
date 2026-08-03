"use client";

import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface AuthGateProps {
  children: ReactNode;
  /** Where to send unauthenticated users */
  redirectTo?: string;
  /** Optional extra gate (e.g. admin check). Return false to deny. */
  allow?: boolean | null;
  /** Where to send authenticated-but-denied users */
  denyRedirectTo?: string;
  /** Show nothing (null) while auth is unresolved or redirecting */
  fallback?: ReactNode;
}

/**
 * Client auth gate: never paint protected UI before redirecting.
 * Prefer server `redirect()` / middleware when possible; this covers
 * existing client-only admin surfaces.
 */
export function AuthGate({
  children,
  redirectTo = "/login",
  allow = true,
  denyRedirectTo = "/",
  fallback = null,
}: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const denied = !isLoading && !isAuthenticated;
  const forbidden = !isLoading && isAuthenticated && allow === false;
  const waiting = isLoading || allow === null;
  const ready = !waiting && isAuthenticated && allow === true;

  useEffect(() => {
    if (denied) {
      window.location.replace(redirectTo);
      return;
    }
    if (forbidden) {
      window.location.replace(denyRedirectTo);
    }
  }, [denied, denyRedirectTo, forbidden, redirectTo]);

  if (!ready) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
