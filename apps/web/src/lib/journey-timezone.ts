import { db } from "@/db";

const isIanaTimeZone = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

/**
 * Resolve the account's fixed daily reset zone. Legacy identities initialize
 * from their newest recorded daily-attempt zone, then the request zone, then UTC.
 */
export async function resolveStableJourneyTimeZone(
  userId: string | null,
  requestTimeZone: unknown
): Promise<string> {
  const requestZone = isIanaTimeZone(requestTimeZone) ? requestTimeZone : "UTC";
  if (!userId) return requestZone;

  const user = await db.userOps.findById(userId);
  const savedZone = isIanaTimeZone(user?.journeyTimeZone) ? user.journeyTimeZone : null;
  if (savedZone) return savedZone;

  const attemptZone = await db.puzzleAttemptOps.findNewestDailyTimeZone(userId);
  const initialZone = isIanaTimeZone(attemptZone) ? attemptZone : requestZone;
  const winner = await db.userOps.initializeJourneyTimeZone(userId, initialZone);
  return isIanaTimeZone(winner) ? winner : initialZone;
}
