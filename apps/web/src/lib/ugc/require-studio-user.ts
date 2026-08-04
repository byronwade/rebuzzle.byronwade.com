import { db } from "@/db";
import type { AuthenticatedUser } from "@/lib/auth-middleware";

export async function requireStudioUser(
  user: AuthenticatedUser
): Promise<{ ok: true; user: AuthenticatedUser } | { ok: false; status: 403; error: string }> {
  const row = await db.userOps.findById(user.userId);
  if (!row || row.isGuest || row.email.endsWith("@guest.rebuzzle.local")) {
    return {
      ok: false,
      status: 403,
      error: "Create a free account to use Studio — guest play can’t publish puzzles.",
    };
  }
  return { ok: true, user };
}
