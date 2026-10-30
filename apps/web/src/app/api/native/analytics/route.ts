import { NextResponse } from "next/server";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import type {
  NativeGrowthEvent,
  NativeGrowthEventSource,
  NativeGrowthPlusOfferSource,
  NativeGrowthQualityRating,
} from "@/db/models";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import {
  STOREKIT_TRANSACTION_HEADER,
  verifyPlusTransaction,
} from "@/lib/storekit/plus-entitlement";
import { resolveRequestTimeZone } from "@/lib/timezone";

const sources = new Set<NativeGrowthEventSource>([
  "app",
  "notification",
  "widget",
  "shortcut",
  "share",
]);
const plusOfferSources = new Set<NativeGrowthPlusOfferSource>([
  "archive",
  "settings",
  "journey_insights",
  "journal",
  "free_sample",
]);
const qualityRatings = new Set<NativeGrowthQualityRating>([
  "too_easy",
  "just_right",
  "tough_but_fair",
  "unclear",
]);
const purchaseFunnelEvents = new Set([
  "plus_restore_completed",
  "plus_restore_empty",
  "plus_restore_failed",
]);
const plusSourceEvents = new Set([
  "plus_offer_viewed",
  "plus_purchase_started",
  "plus_purchase_verified",
  "plus_purchase_pending",
  "plus_purchase_cancelled",
  "plus_purchase_unverified",
  "plus_purchase_failed",
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
    plusSourceEvents.has(eventType) &&
    (hasExactKeys(body, ["eventType"]) ||
      (hasExactKeys(body, ["eventType", "source"]) &&
        typeof body.source === "string" &&
        plusOfferSources.has(body.source as NativeGrowthPlusOfferSource)))
  ) {
    // Valid Plus event with an optional closed offer source; source-free legacy events stay valid.
  } else if (
    (eventType === "reminder_enabled" || eventType === "daily_solve_pulse_viewed") &&
    hasExactKeys(body, ["eventType"])
  ) {
    // Valid client event.
  } else if (purchaseFunnelEvents.has(eventType) && hasExactKeys(body, ["eventType"])) {
    // Valid purchase lifecycle event; identity, time, product, and transaction stay server-owned.
  } else if (
    (eventType === "daily_share_started" || eventType === "daily_share_completed") &&
    hasExactKeys(body, ["eventType"])
  ) {
    // Valid share activity event with no client-owned metadata.
  } else if (
    eventType === "daily_quality_feedback" &&
    hasExactKeys(body, ["eventType", "rating", "puzzleDate"]) &&
    typeof body.rating === "string" &&
    typeof body.puzzleDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.puzzleDate) &&
    qualityRatings.has(body.rating as NativeGrowthQualityRating)
  ) {
    // Valid closed-schema event; puzzleDate is checked against the server's local day below.
  } else {
    return failure("Unsupported event", 400);
  }

  try {
    if (
      eventType === "plus_purchase_verified" &&
      !(await verifyPlusTransaction(request.headers.get(STOREKIT_TRANSACTION_HEADER)))
    ) {
      return failure("A valid Apple transaction is required", 403);
    }

    const occurredAt = new Date();
    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(auth.userId, requestTimeZone);
    const eventBase = {
      userId: auth.userId,
      dayKey: getLocalPuzzleDate(occurredAt, timeZone),
      occurredAt,
    };

    if (eventType === "daily_quality_feedback") {
      if (body.puzzleDate !== eventBase.dayKey) {
        return failure("Puzzle date does not match the current daily.", 409);
      }
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
        ...(plusSourceEvents.has(eventType) && typeof body.source === "string"
          ? { source: body.source as NativeGrowthPlusOfferSource }
          : {}),
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
