"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { trackUserSession } from "@/lib/analytics";
import { setupSessionTracking } from "@/lib/session-tracker";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  user: {
    id: string;
    username: string;
    email: string;
    isGuest?: boolean;
  } | null;
  isLoading: boolean;
  isGuest: boolean;
  error?: string;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  userId: null,
  user: null,
  isLoading: false,
  isGuest: false,
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
    isGuest: false,
    refreshAuth: async () => {},
  });

  // Create or get guest session
  const createGuestSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/guest", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setupSessionTracking(data.user.id);

          // Also store guest token in localStorage as backup
          if (typeof window !== "undefined") {
            localStorage.setItem("rebuzzle_guest_id", data.user.id);
          }

          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: true,
            userId: data.user.id,
            user: {
              id: data.user.id,
              username: data.user.username,
              email: data.user.email,
              isGuest: true,
            },
            isLoading: false,
            isGuest: true,
            error: undefined,
          }));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Guest session creation failed:", error);
      return false;
    }
  }, []);

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

          // Check if this is a guest user (email ends with @guest.rebuzzle.local)
          const isGuestUser = data.user.email?.endsWith("@guest.rebuzzle.local") || false;

          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: true,
            userId: data.user.id,
            user: {
              id: data.user.id,
              username: data.user.username || data.user.email?.split("@")[0] || "User",
              email: data.user.email || "",
              isGuest: isGuestUser,
            },
            isLoading: false,
            isGuest: isGuestUser,
            error: undefined,
          }));
          return;
        }
      } else {
        // Log error for debugging
        const errorData = await response.json().catch(() => ({}));
        console.warn("[Auth] Session check failed:", response.status, errorData);
      }

      // No authentication found - create guest session
      const guestCreated = await createGuestSession();

      if (!guestCreated) {
        // Fallback if guest creation fails
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: false,
          userId: null,
          user: null,
          isLoading: false,
          isGuest: false,
          error: undefined,
        }));
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // Try to create guest session as fallback
      const guestCreated = await createGuestSession();

      if (!guestCreated) {
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: false,
          userId: null,
          user: null,
          isLoading: false,
          isGuest: false,
          error: "Authentication check failed",
        }));
      }
    }
  }, [createGuestSession]);

  useEffect(() => {
    // Initialize session tracking
    setupSessionTracking();
    trackUserSession();

    // Initial auth check
    void checkAuth().finally(() => {
      initialCheckComplete.current = true;
    });
  }, [checkAuth]);

  // Re-check auth state when pathname changes (e.g., after login redirect)
  // Only re-check when navigating away from auth pages to avoid unnecessary calls
  // Using a ref to track if initial auth check is complete to avoid double-checking
  const initialCheckComplete = useRef(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    // Skip if initial check isn't complete yet
    if (!initialCheckComplete.current) {
      return;
    }

    // Only re-check if pathname actually changed (not just a re-render)
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;

    // Skip if we're on auth pages
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    if (isAuthPage) {
      return;
    }

    // Skip if we're already loading
    if (authState.isLoading) {
      return;
    }

    void checkAuth();
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

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
