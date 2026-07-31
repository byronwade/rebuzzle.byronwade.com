import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

const AUTH_COOKIE = "rebuzzle_auth";

export type ServerSessionUser = {
  id: string;
  username: string;
  email: string;
  isGuest: boolean;
};

export type ServerSession = {
  authenticated: boolean;
  user: ServerSessionUser | null;
};

/**
 * Read the auth cookie on the server and return a session suitable for
 * seeding the client AuthProvider (avoids a client waterfall on first paint).
 *
 * Uses JWT claims only — no Mongo round-trip on the document critical path.
 * Stale users are corrected on next /api/auth/session refresh.
 */
export async function getServerSession(): Promise<ServerSession> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get(AUTH_COOKIE)?.value;

    if (!authToken) {
      return { authenticated: false, user: null };
    }

    const payload = await verifyToken(authToken);
    if (!payload?.userId) {
      return { authenticated: false, user: null };
    }

    const email = payload.email || "";
    const isGuest = email.endsWith("@guest.rebuzzle.local");

    return {
      authenticated: true,
      user: {
        id: payload.userId,
        username: payload.username || email.split("@")[0] || "User",
        email,
        isGuest,
      },
    };
  } catch (error) {
    // Cache Components prerender intentionally rejects cookies() once the
    // static shell is done — treat that as unauthenticated, not a failure.
    const digest =
      error && typeof error === "object" && "digest" in error
        ? String((error as { digest?: unknown }).digest)
        : "";
    if (
      digest !== "HANGING_PROMISE_REJECTION" &&
      !(error instanceof Error && error.message.includes("prerendering"))
    ) {
      console.error("[getServerSession] Error:", error);
    }
    return { authenticated: false, user: null };
  }
}
