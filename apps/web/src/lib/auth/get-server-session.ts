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
    console.error("[getServerSession] Error:", error);
    return { authenticated: false, user: null };
  }
}
