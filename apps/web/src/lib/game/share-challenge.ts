/**
 * Beat-me deep links for share → return loops.
 * URL shape: /?beat=<userId>&from=share
 */

export const BEAT_ME_PARAM = "beat";
export const SHARE_FROM_PARAM = "from";

export function buildBeatMeUrl(origin: string, userId?: string | null): string {
  const base = origin.replace(/\/$/, "") || "https://rebuzzle.com";
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
  if (!success) return "Your turn — beat me today.";
  if (streak > 1) return `🔥 ${streak}-day streak · Beat me today.`;
  return "Beat me today.";
}
