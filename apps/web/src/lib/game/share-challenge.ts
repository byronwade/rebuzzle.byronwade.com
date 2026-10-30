/**
 * Beat-me deep links for share → return loops.
 * New links carry only a closed, non-identifying source marker.
 */

export const SHARE_SOURCE_PARAM = "source";
const LEGACY_SHARE_FROM_PARAM = "from";

export function buildBeatMeUrl(origin: string): string {
  const base = origin.replace(/\/$/, "") || "https://rebuzzle.byronwade.com";
  const url = new URL(base);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  url.searchParams.set(SHARE_SOURCE_PARAM, "share");
  return url.toString();
}

export function parseBeatMeChallenge(search: string | URLSearchParams): {
  fromShare: boolean;
} {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    fromShare:
      params.get(SHARE_SOURCE_PARAM) === "share" || params.get(LEGACY_SHARE_FROM_PARAM) === "share",
  };
}

export function shouldReportShareArrival(input: {
  fromShare: boolean;
  userId: string | null;
  authLoading: boolean;
  sessionRestoreSucceeded: boolean;
  alreadyReported: boolean;
}): boolean {
  return (
    input.fromShare &&
    Boolean(input.userId) &&
    !input.authLoading &&
    input.sessionRestoreSucceeded &&
    !input.alreadyReported
  );
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
    ? `${"🟥".repeat(used - 1)}🟩${"⬜".repeat(limit - used)}`
    : `${"🟥".repeat(used)}${"⬜".repeat(limit - used)}`;
}
