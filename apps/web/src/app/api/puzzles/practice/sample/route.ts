import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { findFreeArchiveSample } from "@/lib/game/archive-sample";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import { toPublicArchivePuzzle } from "@/lib/game/public-archive-puzzle";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestTimeZone } from "@/lib/timezone";

const NO_STORE = { "Cache-Control": "private, no-store" };

const sampleIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    return `rate-limit:practice-sample:${ip}`;
  },
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** One answer-free, unscored sample of the Plus archive. */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return json({ success: false, error: "Not authenticated" }, 401);

    const [ipLimit, userLimit] = await Promise.all([
      sampleIpRateLimit(request),
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 20,
        keyGenerator: () => getUserKey(`practice-sample:${user.userId}`),
      })(request),
    ]);
    const rejectedLimit = [ipLimit, userLimit].find((limit) => limit && !limit.success);
    if (rejectedLimit) {
      return json(
        { success: false, error: "Too many sample requests. Slow down." },
        429,
        rejectedLimit === ipLimit
          ? {
              "Retry-After": String(ipLimit?.retryAfter ?? 60),
              "X-RateLimit-Limit": String(ipLimit?.limit ?? 20),
              "X-RateLimit-Remaining": String(ipLimit?.remaining ?? 0),
            }
          : {}
      );
    }

    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const localDateKey = getLocalPuzzleDate(new Date(), timeZone);
    const puzzle = await findFreeArchiveSample(localDateKey);
    if (!puzzle)
      return json({ success: false, error: "A sample puzzle is not available yet." }, 404);

    return json(toPublicArchivePuzzle(puzzle));
  } catch (error) {
    console.error("Error loading the free archive sample:", error);
    return json({ success: false, error: "Unable to load the sample puzzle" }, 500);
  }
}
