import { cookies } from "next/headers";
import { db } from "@/db";
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

    const user = await db.userOps.findById(payload.userId);
    if (!user) {
      return { authenticated: false, user: null };
    }

    const isGuest = user.email?.endsWith("@guest.rebuzzle.local") ?? false;

    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username || user.email?.split("@")[0] || "User",
        email: user.email || "",
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
