import { NextResponse } from "next/server";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
import { PuzzlePlaytestConflictError } from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import { db } from "@/db";
import type { PuzzlePlaytestFailureReason, User } from "@/db/models";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };
const MINIMUM_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;
const MINIMUM_COMPLETED_GAMES = 3;

type ReviewerAccess =
  | { reviewer: User; status: 200 }
  | { reviewer: null; status: 401 | 403; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function getEligibleReviewer(request: Request, now = new Date()): Promise<ReviewerAccess> {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return { reviewer: null, status: 401, error: "A registered Rebuzzle account is required" };
  }
  const [user, stats] = await Promise.all([
    db.userOps.findById(authUser.userId),
    db.userStatsOps.findByUserId(authUser.userId),
  ]);
  if (!user || user.isGuest || user.email.endsWith("@guest.rebuzzle.local")) {
    return { reviewer: null, status: 401, error: "A registered Rebuzzle account is required" };
  }
  const accountAgeMs = now.getTime() - new Date(user.createdAt).getTime();
  if (
    !Number.isFinite(accountAgeMs) ||
    accountAgeMs < MINIMUM_ACCOUNT_AGE_MS ||
    !stats ||
    stats.totalGames < MINIMUM_COMPLETED_GAMES
  ) {
    return {
      reviewer: null,
      status: 403,
      error: "Playtest reviewers need a 24-hour-old account and three completed puzzles",
    };
  }
  return { reviewer: user, status: 200 };
}

export async function GET(request: Request) {
  try {
    const access = await getEligibleReviewer(request);
    if (!access.reviewer) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status, headers: PRIVATE_NO_STORE }
      );
    }
    const result = await puzzlePlaytestService.getNext(access.reviewer.id);
    return NextResponse.json({ success: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load puzzle playtest";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getEligibleReviewer(request);
    if (!access.reviewer) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status, headers: PRIVATE_NO_STORE }
      );
    }
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid playtest response" },
        { status: 400, headers: PRIVATE_NO_STORE }
      );
    }
    const progress = await puzzlePlaytestService.submitReview({
      reviewerId: access.reviewer.id,
      fixtureId: typeof body.fixtureId === "string" ? body.fixtureId : "",
      guess: typeof body.guess === "string" ? body.guess : undefined,
      gaveUp: body.gaveUp === true,
      failureReason:
        typeof body.failureReason === "string"
          ? (body.failureReason as PuzzlePlaytestFailureReason)
          : undefined,
      confidence: typeof body.confidence === "number" ? body.confidence : undefined,
      elapsedMs: typeof body.elapsedMs === "number" ? body.elapsedMs : undefined,
    });
    return NextResponse.json({ success: true, progress }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof PuzzlePlaytestConflictError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409, headers: PRIVATE_NO_STORE }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to save playtest response";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400, headers: PRIVATE_NO_STORE }
    );
  }
}
