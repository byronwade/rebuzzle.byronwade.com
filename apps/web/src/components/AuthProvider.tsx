"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { trackUserSession } from "@/lib/analytics";
import type { ServerSession } from "@/lib/auth/get-server-session";
import { setupSessionTracking } from "@/lib/session-tracker";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  isGuest?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  user: AuthUser | null;
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

type SeedFn = (session: ServerSession | null) => void;

const AuthSeedContext = createContext<SeedFn>(() => {});

export function useAuth() {
  return useContext(AuthContext);
}

/** Apply a streamed server session without remounting children. */
export function useAuthSeed() {
  return useContext(AuthSeedContext);
}

function sessionToState(
  session: ServerSession | null | undefined
): Pick<AuthState, "isAuthenticated" | "userId" | "user" | "isGuest" | "isLoading" | "error"> {
  if (session?.authenticated && session.user) {
    return {
      isAuthenticated: true,
      userId: session.user.id,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        isGuest: session.user.isGuest,
      },
      isGuest: session.user.isGuest,
      isLoading: false,
      error: undefined,
    };
  }

  return {
    isAuthenticated: false,
    userId: null,
    user: null,
    isGuest: false,
    isLoading: false,
    error: undefined,
  };
}

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  /** Server-seeded session to avoid a client waterfall on first paint */
  initialSession?: ServerSession | null;
}) {
  const pathname = usePathname();
  const seeded = sessionToState(initialSession);
  const [authState, setAuthState] = useState<AuthState>({
    ...seeded,
    // If we didn't get a server session, still show a brief loading state
    isLoading: initialSession === undefined,
    refreshAuth: async () => {},
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.authenticated && data.user) {
          setupSessionTracking(data.user.id);
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
        const errorData = await response.json().catch(() => ({}));
        console.warn("[Auth] Session check failed:", response.status, errorData);
      }

      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        userId: null,
        user: null,
        isLoading: false,
        isGuest: false,
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
        isGuest: false,
        error: undefined,
      }));
    }
  }, []);

  const initialCheckComplete = useRef(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    setupSessionTracking();
    trackUserSession();

    // When server already seeded a session, skip the initial client fetch
    if (initialSession !== undefined) {
      if (initialSession?.authenticated && initialSession.user) {
        setupSessionTracking(initialSession.user.id);
      }
      initialCheckComplete.current = true;
      return;
    }

    void checkAuth().finally(() => {
      initialCheckComplete.current = true;
    });
  }, [checkAuth, initialSession]);

  useEffect(() => {
    if (!initialCheckComplete.current) {
      return;
    }

    if (previousPathname.current === pathname) {
      return;
    }

    const previous = previousPathname.current;
    previousPathname.current = pathname;

    // Only re-check after leaving auth pages (login/signup) — not on every navigation
    const wasAuthPage = previous === "/login" || previous === "/signup";
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    if (!wasAuthPage || isAuthPage) {
      return;
    }

    if (authState.isLoading) {
      return;
    }

    void checkAuth();
  }, [pathname, checkAuth, authState.isLoading]);

  const refreshAuth = useCallback(async () => {
    // Quiet refresh — do not flip isLoading or the whole UI flashes a skeleton
    // (guest warm-up, post-login, etc.). Keep the current shell painted.
    await checkAuth();
  }, [checkAuth]);

  const seedSession = useCallback((session: ServerSession | null) => {
    const next = sessionToState(session);
    setAuthState((prev) => ({
      ...prev,
      ...next,
      isLoading: false,
    }));
    if (session?.authenticated && session.user) {
      setupSessionTracking(session.user.id);
    }
    initialCheckComplete.current = true;
  }, []);

  const authValue: AuthState = {
    ...authState,
    refreshAuth,
  };

  return (
    <AuthSeedContext.Provider value={seedSession}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </AuthSeedContext.Provider>
  );
}
