"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
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
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    if (allow === false) {
      router.replace(denyRedirectTo);
      return;
    }
    if (allow === null) return; // still resolving extra gate
    setReady(true);
  }, [allow, denyRedirectTo, isAuthenticated, isLoading, redirectTo, router]);

  if (isLoading || !isAuthenticated || allow === false || allow === null || !ready) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
