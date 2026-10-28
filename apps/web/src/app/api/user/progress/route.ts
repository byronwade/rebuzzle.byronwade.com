import { NextResponse } from "next/server";
import { db } from "@/db";
import type { DailyProgress } from "@/db/models";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import {
  type DailyProgressBackfillStatus,
  getDailyProgressBackfillStatus,
} from "@/lib/daily-progress-backfill-status";
import { addCalendarDays, getLocalPuzzleDate, isValidIanaTimeZone } from "@/lib/game/daily-lock";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { resolveRequestTimeZone } from "@/lib/timezone";

export { getDailyProgressBackfillStatus };

type JourneyEntry = {
  puzzleDate: string;
  puzzleId: string;
  outcome: "solved" | "failed";
  attempts: number;
  hintCount: number | null;
  completedAt: Date;
  timeZone: string | null;
};

const privateHeaders = { "Cache-Control": buildCacheControl({ private: true }) };

function isPuzzleDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function weekBounds(asOfPuzzleDate: string): { start: string; end: string } {
  const [year, month, day] = asOfPuzzleDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const start = addCalendarDays(asOfPuzzleDate, -daysSinceMonday);
  return { start, end: addCalendarDays(start, 6) };
}

function normalizeEntry(row: unknown): JourneyEntry | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<DailyProgress>;
  const outcome = value.outcome;
  if (outcome !== "solved" && outcome !== "failed") return null;
  const validAttempts =
    outcome === "solved"
      ? Number.isInteger(value.attempts) && value.attempts! >= 1 && value.attempts! <= 3
      : value.attempts === 3;
  if (
    !isPuzzleDate(value.puzzleDate) ||
    typeof value.puzzleId !== "string" ||
    value.puzzleId.length === 0 ||
    !validAttempts ||
    !(value.completedAt instanceof Date) ||
    !Number.isFinite(value.completedAt.getTime())
  ) {
    return null;
  }

  const hintCount =
    Number.isInteger(value.hintCount) && value.hintCount! >= 0 ? value.hintCount! : null;
  const timeZone = isValidIanaTimeZone(value.timeZone ?? "") ? value.timeZone! : null;
  return {
    puzzleDate: value.puzzleDate,
    puzzleId: value.puzzleId,
    outcome,
    attempts: value.attempts!,
    hintCount,
    completedAt: value.completedAt,
    timeZone,
  };
}

function summarize(entries: JourneyEntry[], weekStart: string, asOf: string) {
  const finishes = entries.length;
  const solves = entries.filter((entry) => entry.outcome === "solved");
  const firstGuessSolves = solves.filter((entry) => entry.attempts === 1).length;
  const unassistedSolves = solves.filter((entry) => entry.hintCount === 0).length;
  const totalXP = entries.reduce((total, entry) => {
    const solved = entry.outcome === "solved";
    return (
      total +
      25 +
      (solved ? 75 : 0) +
      (solved && entry.attempts === 1 ? 25 : 0) +
      (solved && entry.hintCount === 0 ? 25 : 0)
    );
  }, 0);
  const completedThisWeek = entries.filter(
    (entry) => entry.puzzleDate >= weekStart && entry.puzzleDate <= asOf
  ).length;
  const badges: string[] = [];
  if (finishes >= 1) badges.push("first-finish");
  if (firstGuessSolves >= 1) badges.push("first-guess-solve");
  if (unassistedSolves >= 3) badges.push("three-unassisted-solves");
  if (finishes >= 7) badges.push("seven-finishes");

  return {
    totalXP,
    level: Math.floor(totalXP / 300) + 1,
    xpIntoLevel: totalXP % 300,
    finishes,
    solves: solves.length,
    firstGuessSolves,
    unassistedSolves,
    completedThisWeek,
    badges,
  };
}

function toResponseEntry(entry: JourneyEntry) {
  return { ...entry, completedAt: entry.completedAt.toISOString() };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: privateHeaders }
      );

    const user = await db.userOps.findById(auth.userId);
    if (!user)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: privateHeaders }
      );

    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.id, requestTimeZone);
    const asOfPuzzleDate = getLocalPuzzleDate(new Date(), timeZone);
    const { start: currentWeekStart, end: currentWeekEnd } = weekBounds(asOfPuzzleDate);

    // Heal response-loss failures from the server-persisted final attempt, even
    // when the player returns after the next local daily reset.
    let reconciliationRequested = false;
    let reconciliationFailed = false;
    const requestReconciliation = async () => {
      try {
        await db.dailyProgressBackfillOps.requestReconciliation(user.id);
        reconciliationRequested = true;
      } catch (error) {
        reconciliationFailed = true;
        console.error("Failed to request Journey reconciliation:", error);
      }
    };

    const recentFinalAttempts = await db.puzzleAttemptOps.findRecentFinalDailyAttempts(user.id, 42);
    for (const attempt of recentFinalAttempts) {
      try {
        await db.dailyProgressOps.materializeFromAttempt(attempt);
      } catch (error) {
        console.error("Failed to repair a Journey progress row:", error);
        await requestReconciliation();
      }
    }

    const [backfillState, finalAttemptCount, rows] = await Promise.all([
      db.dailyProgressBackfillOps.findState(user.id),
      db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts(user.id),
      db.dailyProgressOps.listForUser(user.id),
    ]);
    const progressCount = (rows as unknown[]).filter((row) => normalizeEntry(row) !== null).length;
    const reconciliationPending = backfillState
      ? backfillState.reconciliationGeneration !== undefined
        ? backfillState.reconciliationGeneration >
          (backfillState.reconciliationProcessedGeneration ?? 0)
        : Boolean(
            backfillState.reconciliationRequestedAt &&
              (!backfillState.reconciliationProcessedAt ||
                backfillState.reconciliationRequestedAt > backfillState.reconciliationProcessedAt)
          )
      : false;
    if (
      backfillState?.status === "complete" &&
      finalAttemptCount > progressCount &&
      !reconciliationPending
    ) {
      await requestReconciliation();
    }
    const backfillStatus: DailyProgressBackfillStatus = reconciliationRequested
      ? "in_progress"
      : reconciliationFailed
        ? "failed"
        : getDailyProgressBackfillStatus(backfillState, finalAttemptCount, progressCount);

    if (backfillStatus !== "complete") {
      return NextResponse.json(
        {
          asOfPuzzleDate,
          currentWeekStart,
          currentWeekEnd,
          summary: null,
          recentEntries: [],
          backfill: { status: backfillStatus },
        },
        { headers: privateHeaders }
      );
    }

    const byPuzzleDate = new Map<string, JourneyEntry>();
    for (const row of rows as unknown[]) {
      const entry = normalizeEntry(row);
      if (entry && entry.puzzleDate <= asOfPuzzleDate && !byPuzzleDate.has(entry.puzzleDate)) {
        byPuzzleDate.set(entry.puzzleDate, entry);
      }
    }
    const allEntries = [...byPuzzleDate.values()].sort((a, b) =>
      b.puzzleDate.localeCompare(a.puzzleDate)
    );
    const currentWeekEntries = allEntries.filter((entry) => entry.puzzleDate >= currentWeekStart);
    const priorEntries = allEntries
      .filter((entry) => entry.puzzleDate < currentWeekStart)
      .slice(0, 35);
    const recentEntries = [...currentWeekEntries, ...priorEntries].sort((a, b) =>
      b.puzzleDate.localeCompare(a.puzzleDate)
    );

    return NextResponse.json(
      {
        asOfPuzzleDate,
        currentWeekStart,
        currentWeekEnd,
        summary: summarize(allEntries, currentWeekStart, asOfPuzzleDate),
        recentEntries: recentEntries.map(toResponseEntry),
        backfill: { status: "complete" },
      },
      { headers: privateHeaders }
    );
  } catch (error) {
    console.error("Failed to fetch Journey progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Journey progress" },
      { status: 500, headers: privateHeaders }
    );
  }
}
