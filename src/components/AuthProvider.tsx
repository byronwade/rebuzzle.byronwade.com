"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { trackUserSession } from "@/lib/analytics";
import { setupSessionTracking } from "@/lib/session-tracker";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  user: {
    id: string;
    username: string;
    email: string;
  } | null;
  isLoading: boolean;
  error?: string;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  userId: null,
  user: null,
  isLoading: false,
  refreshAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    user: null,
    isLoading: true,
    refreshAuth: async () => {},
  });

  // Check for authentication state from server
  const checkAuth = useCallback(async () => {
    try {
      // Fetch authentication state from server (reads JWT from cookie)
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include", // Include cookies in request
        cache: "no-store", // Always fetch fresh auth state
      });

      if (response.ok) {
        const data = await response.json();

        if (data.authenticated && data.user) {
          // Update session with user ID
          setupSessionTracking(data.user.id);

          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: true,
            userId: data.user.id,
            user: {
              id: data.user.id,
              username:
                data.user.username ||
                data.user.email?.split("@")[0] ||
                "User",
              email: data.user.email || "",
            },
            isLoading: false,
            error: undefined,
          }));
          return;
        }
      } else {
        // Log error for debugging
        const errorData = await response.json().catch(() => ({}));
        console.warn(
          "[Auth] Session check failed:",
          response.status,
          errorData
        );
      }

      // No authentication found
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        userId: null,
        user: null,
        isLoading: false,
        error: undefined,
      }));
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        userId: null,
        user: null,
        isLoading: false,
        error: "Authentication check failed",
      }));
    }
  }, []);

  useEffect(() => {
    // Initialize session tracking
    setupSessionTracking();
    trackUserSession();

    // Initial auth check
    void checkAuth();
  }, [checkAuth]);

  // Re-check auth state when pathname changes (e.g., after login redirect)
  // Only re-check when navigating away from auth pages to avoid unnecessary calls
  useEffect(() => {
    // Skip initial mount (handled by the other effect)
    // Only re-check if we're not currently loading and not on an auth page
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    if (!authState.isLoading && !isAuthPage) {
      void checkAuth();
    }
  }, [pathname, checkAuth, authState.isLoading]);

  // Create refresh function that can be called manually
  const refreshAuth = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    await checkAuth();
  }, [checkAuth]);

  // Update context value with refresh function
  useEffect(() => {
    setAuthState((prev) => ({ ...prev, refreshAuth }));
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}
