/**
 * Beat-me deep links for share → return loops.
 * URL shape: /?beat=<userId>&from=share
 */

export const BEAT_ME_PARAM = "beat";
export const SHARE_FROM_PARAM = "from";

export function buildBeatMeUrl(origin: string, userId?: string | null): string {
  const base = origin.replace(/\/$/, "") || "https://rebuzzle.byronwade.com";
  if (!userId) return base;
  const url = new URL(base);
  url.searchParams.set(BEAT_ME_PARAM, userId);
  url.searchParams.set(SHARE_FROM_PARAM, "share");
  return url.toString();
}

export function parseBeatMeChallenge(search: string | URLSearchParams): {
  challengerId: string | null;
  fromShare: boolean;
} {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const challengerId = params.get(BEAT_ME_PARAM)?.trim() || null;
  const fromShare = params.get(SHARE_FROM_PARAM) === "share";
  return { challengerId, fromShare };
}

export function beatMeShareLine(streak: number, success: boolean): string {
  // Give shared results a friendly challenge without exposing the answer.
  if (!success) return "Today's puzzle:";
  if (streak > 1) return `🔥 ${streak}-day streak. Can you beat me?`;
  return "Can you beat me?";
}

/** Spoiler-free attempt history: misses precede the winning guess. */
export function buildShareSquares(success: boolean, attempts: number, maxAttempts: number): string {
  const limit = Number.isFinite(maxAttempts)
    ? Math.max(1, Math.min(20, Math.trunc(maxAttempts)))
    : 1;
  const used = Number.isFinite(attempts) ? Math.max(1, Math.min(limit, Math.trunc(attempts))) : 1;
  return success
    ? "🟥".repeat(used - 1) + "🟩" + "⬜".repeat(limit - used)
    : "🟥".repeat(used) + "⬜".repeat(limit - used);
}
