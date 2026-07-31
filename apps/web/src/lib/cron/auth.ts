import { NextResponse } from "next/server";

/**
 * Shared Vercel cron auth — accept either:
 * - Authorization: Bearer <CRON_SECRET>
 * - x-vercel-cron-secret: <VERCEL_CRON_SECRET>
 *
 * Vercel typically only sends the Bearer CRON_SECRET header.
 */
export function authorizeCron(
  request: Request
): { ok: true } | { ok: false; response: NextResponse } {
  const authHeader = request.headers.get("authorization");
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");

  const isProduction = process.env.NODE_ENV === "production";
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

  const vercelOk = Boolean(vercelCronSecretEnv) && vercelCronSecret === vercelCronSecretEnv;
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (isProduction) {
    if (!(vercelCronSecretEnv || cronSecret)) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, error: "Cron authentication not configured" },
          { status: 500 }
        ),
      };
    }
    if (!(vercelOk || bearerOk)) {
      return {
        ok: false,
        response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { ok: true };
  }

  // Dev: if secrets are configured, still enforce; otherwise allow
  if ((vercelCronSecretEnv || cronSecret) && !(vercelOk || bearerOk)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
