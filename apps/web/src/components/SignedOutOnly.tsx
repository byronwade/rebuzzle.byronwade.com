"use client";

import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

/** Renders its children only for visitors without a full account (guests included). */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isGuest } = useAuth();
  if (isAuthenticated && !isGuest) return null;
  return children;
}
