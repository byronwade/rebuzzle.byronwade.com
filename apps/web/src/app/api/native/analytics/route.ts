import { NextResponse } from "next/server";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import type {
  NativeGrowthEvent,
  NativeGrowthEventSource,
  NativeGrowthQualityRating,
} from "@/db/models";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import { resolveRequestTimeZone } from "@/lib/timezone";

const sources = new Set<NativeGrowthEventSource>(["app", "notification", "widget", "shortcut"]);
const qualityRatings = new Set<NativeGrowthQualityRating>([
  "too_easy",
  "just_right",
  "tough_but_fair",
  "unclear",
]);
const failure = (error: string, status: number) =>
  NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

/** POST /api/native/analytics — first-party native funnel events with server-owned identity/time. */
export async function POST(request: Request) {
  const limit = await rateLimiters.api(request);
  if (limit && !limit.success) return failure("Too many requests", 429);

  const auth = await getAuthenticatedUser(request);
  if (!auth) return failure("Not authenticated", 401);

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return failure("Content-Type must be application/json", 400);
  }

  const text = await request.text();
  if (text.length === 0 || text.length > 512) return failure("Invalid event payload", 400);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return failure("Invalid JSON in request body", 400);
  }
  if (!isObject(body) || typeof body.eventType !== "string") {
    return failure("Invalid event payload", 400);
  }

  const eventType = body.eventType;
  if (
    eventType === "daily_opened" &&
    hasExactKeys(body, ["eventType", "source"]) &&
    typeof body.source === "string" &&
    sources.has(body.source as NativeGrowthEventSource)
  ) {
    // Valid client event.
  } else if (
    (eventType === "plus_offer_viewed" || eventType === "reminder_enabled") &&
    hasExactKeys(body, ["eventType"])
  ) {
    // Valid client event.
  } else if (
    eventType === "daily_quality_feedback" &&
    hasExactKeys(body, ["eventType", "rating"]) &&
    typeof body.rating === "string" &&
    qualityRatings.has(body.rating as NativeGrowthQualityRating)
  ) {
    // Valid closed-schema client event.
  } else {
    return failure("Unsupported event", 400);
  }

  try {
    const occurredAt = new Date();
    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(auth.userId, requestTimeZone);
    const eventBase = {
      userId: auth.userId,
      dayKey: getLocalPuzzleDate(occurredAt, timeZone),
      occurredAt,
    };

    if (eventType === "daily_quality_feedback") {
      await nativeGrowthEventOps.recordDailyQualityFeedback({
        ...eventBase,
        eventType,
        rating: body.rating as NativeGrowthQualityRating,
      });
    } else {
      const event: NativeGrowthEvent = {
        ...eventBase,
        eventType: eventType as NativeGrowthEvent["eventType"],
        ...(eventType === "daily_opened" ? { source: body.source as NativeGrowthEventSource } : {}),
      } as NativeGrowthEvent;
      await nativeGrowthEventOps.recordOnce(event);
    }
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[native-analytics] Event write failed:", error);
    return failure("Unable to record event", 503);
  }
}
