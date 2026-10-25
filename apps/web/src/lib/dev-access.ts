/**
 * Server gate for Dev Mode APIs (puzzle regeneration, attempt resets, Visual Lab).
 *
 * These actions replace today's puzzle for everyone, wipe daily locks and spend
 * AI credits, so outside local development only admins may use them.
 */

import { isAdmin } from "@/lib/admin-auth";
import { type AuthenticatedUser, getAuthenticatedUser } from "@/lib/auth-middleware";

export type DevAccess =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; status: 401 | 403; error: string };

export function isLocalDevelopment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production";
}

export async function authorizeDevMode(request: Request): Promise<DevAccess> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false, status: 401, error: "Sign in to use Dev Mode" };
  }
  if (isLocalDevelopment() || (await isAdmin(user.userId))) {
    return { ok: true, user };
  }
  return { ok: false, status: 403, error: "Dev Mode is for admins only" };
}
