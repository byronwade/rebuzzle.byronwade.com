"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  userId: null,
  user: null,
  isLoading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    // Initialize session tracking
    const session = setupSessionTracking();
    trackUserSession();

    // Check for authentication state from server
    const checkAuth = async () => {
      try {
        // Fetch authentication state from server (reads JWT from cookie)
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include", // Include cookies in request
        });

        if (response.ok) {
          const data = await response.json();

          if (data.authenticated && data.user) {
            // Update session with user ID
            setupSessionTracking(data.user.id);

            setAuthState({
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
            });
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

        // No authentication found - check if guest mode
        const isGuest = localStorage.getItem("guestMode") === "true";

        setAuthState({
          isAuthenticated: false,
          userId: null,
          user: null,
          isLoading: false,
        });
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState({
          isAuthenticated: false,
          userId: null,
          user: null,
          isLoading: false,
          error: "Authentication check failed",
        });
      }
    };

    void checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}
