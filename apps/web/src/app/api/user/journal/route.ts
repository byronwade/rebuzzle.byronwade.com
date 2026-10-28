import { NextResponse } from "next/server";
import type { DailyProgress, Puzzle } from "@/db/models";
import {
  dailyProgressBackfillOps,
  dailyProgressOps,
  journalNoteOps,
  puzzleAttemptOps,
  puzzleOps,
} from "@/db/operations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getDailyProgressBackfillStatus } from "@/lib/daily-progress-backfill-status";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";
import { toPublicVisual } from "@/lib/game/public-visual";

const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 100;
const PRIVATE_HEADERS = { "Cache-Control": buildCacheControl({ private: true }) };

function parseLimit(value: string | null): number {
  if (value === null) return DEFAULT_PAGE_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PAGE_LIMIT;
  return Math.min(parsed, MAX_PAGE_LIMIT);
}

function isPuzzleDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: PRIVATE_HEADERS });
}

function toJournalEntry(
  progress: DailyProgress,
  puzzle: Puzzle,
  note: { note: string; revision: number } | undefined
) {
  const hintsUsed =
    Number.isInteger(progress.hintCount) && (progress.hintCount ?? -1) >= 0
      ? progress.hintCount
      : null;
  return {
    puzzleId: progress.puzzleId,
    puzzleDate: progress.puzzleDate,
    puzzleType: puzzle.puzzleType ?? "rebus",
    clue: puzzle.puzzle,
    answer: puzzle.answer,
    explanation: puzzle.explanation ?? "",
    won: progress.outcome === "solved",
    attempts: progress.attempts,
    hintsUsed,
    visual: toPublicVisual(puzzle.visual),
    hints: Array.isArray(puzzle.hints)
      ? puzzle.hints.filter((hint): hint is string => typeof hint === "string")
      : [],
    note: note?.note ?? "",
    noteRevision: note?.revision ?? 0,
  };
}

/** Reconstruct the signed-in Plus player's completed daily journal from account-owned records. */
export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return failure("Not authenticated", 401);
    if (auth.isGuestToken) return failure("Sign in to sync your journal.", 403);

    const rate = await rateLimit({
      name: "user-journal-read",
      windowMs: 60 * 1000,
      maxRequests: 30,
      keyGenerator: () => getUserKey(`journal:${auth.userId}`),
    })(request);
    if (rate && !rate.success) return failure("Too many journal requests. Slow down.", 429);

    if (!(await hasPlusEntitlement(request))) {
      return failure("Rebuzzle Plus is required to sync your journal.", 403);
    }

    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const beforePuzzleDate = url.searchParams.get("before");
    if (beforePuzzleDate !== null && !isPuzzleDate(beforePuzzleDate)) {
      return failure("Invalid journal cursor.", 400);
    }

    const [backfillState, finalAttemptCount, progressCount, rows] = await Promise.all([
      dailyProgressBackfillOps.findState(auth.userId),
      puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts(auth.userId),
      dailyProgressOps.countValidForUser(auth.userId),
      dailyProgressOps.listForUserPage(auth.userId, {
        limit: limit + 1,
        ...(beforePuzzleDate ? { beforePuzzleDate } : {}),
      }),
    ]);
    const historyStatus = getDailyProgressBackfillStatus(
      backfillState,
      finalAttemptCount,
      progressCount
    );
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const puzzleIds = [...new Set(page.map((row) => row.puzzleId))];
    const [puzzles, notes] = await Promise.all([
      puzzleOps.findByIds(puzzleIds),
      journalNoteOps.listForUserPage(auth.userId, puzzleIds),
    ]);
    const puzzlesById = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));
    const notesByPuzzleId = new Map(notes.map((note) => [note.puzzleId, note]));
    const lastEntry = page.at(-1);

    return NextResponse.json(
      {
        success: true,
        entries: page.flatMap((row) => {
          const puzzle = puzzlesById.get(row.puzzleId);
          return puzzle ? [toJournalEntry(row, puzzle, notesByPuzzleId.get(row.puzzleId))] : [];
        }),
        nextCursor: hasMore && lastEntry ? lastEntry.puzzleDate : null,
        historyStatus,
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to load account journal.", error);
    return failure("Unable to load your journal. Try again when you’re connected.", 500);
  }
}
