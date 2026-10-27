import { type JourneyBackfillStore, runJourneyProgressBackfill } from "../daily-progress-backfill";
import type { DailyProgressBackfillState, PuzzleAttempt } from "../models";

const attempt = (id: string, puzzleDate: string, attemptedAt: string): PuzzleAttempt => ({
  id,
  userId: "user-1",
  puzzleId: `puzzle-${puzzleDate}`,
  attemptedAnswer: "answer",
  isCorrect: true,
  isFinal: true,
  attemptNumber: 1,
  puzzleDate,
  attemptedAt: new Date(attemptedAt),
});

function memoryStore(rows: PuzzleAttempt[]) {
  const states = new Map<string, DailyProgressBackfillState>();
  const materialized = new Set<string>();
  const failFor = new Set<string>();
  let failedAlready = false;
  const store: JourneyBackfillStore = {
    async listUsersAfter(afterId, limit) {
      return ["user-1", "user-2"]
        .filter((id) => !afterId || id > afterId)
        .slice(0, limit)
        .map((id) => ({ id }));
    },
    async findState(userId) {
      return states.get(userId) ?? null;
    },
    async ensureState(userId, cutoffAt, updatedAt) {
      const value = {
        _id: userId,
        userId,
        status: "scanning" as const,
        cutoffAt,
        updatedAt,
      };
      states.set(userId, value);
      return value;
    },
    async findInitialBatch(userId, cutoffAt, cursorPuzzleDate, limit) {
      return rows
        .filter(
          (row) =>
            row.userId === userId &&
            row.isFinal &&
            /^\d{4}-\d{2}-\d{2}$/.test(row.puzzleDate ?? "") &&
            row.attemptedAt <= cutoffAt &&
            (!cursorPuzzleDate || row.puzzleDate! > cursorPuzzleDate)
        )
        .sort((a, b) => a.puzzleDate!.localeCompare(b.puzzleDate!))
        .slice(0, limit);
    },
    async findDeltaBatch(
      userId,
      cutoffAt,
      deltaCutoffAt,
      cursorAttemptedAt,
      cursorAttemptId,
      limit
    ) {
      return rows
        .filter((row) => {
          if (
            row.userId !== userId ||
            !row.isFinal ||
            !/^\d{4}-\d{2}-\d{2}$/.test(row.puzzleDate ?? "") ||
            row.attemptedAt <= cutoffAt ||
            row.attemptedAt > deltaCutoffAt
          ) {
            return false;
          }
          if (!cursorAttemptedAt || !cursorAttemptId) return true;
          return (
            row.attemptedAt > cursorAttemptedAt ||
            (row.attemptedAt.getTime() === cursorAttemptedAt.getTime() && row.id > cursorAttemptId)
          );
        })
        .sort(
          (a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime() || a.id.localeCompare(b.id)
        )
        .slice(0, limit);
    },
    async saveState(state) {
      states.set(state.userId, state);
    },
    async materialize(row) {
      if (failFor.has(row.id) && !failedAlready) {
        failedAlready = true;
        throw new Error("temporary Mongo failure");
      }
      if (!row.puzzleDate || row.attemptNumber === undefined) {
        return { progress: null, inserted: false };
      }
      const key = `${row.userId}:${row.puzzleDate}`;
      const inserted = !materialized.has(key);
      materialized.add(key);
      return { progress: { userId: row.userId, puzzleDate: row.puzzleDate } as never, inserted };
    },
  };
  return { store, states, materialized, failFor };
}

it("backfills bounded daily batches, includes the delta window, and completes empty accounts", async () => {
  const rows = [
    attempt("old-1", "2026-10-24", "2026-10-24T20:00:00Z"),
    attempt("old-2", "2026-10-25", "2026-10-25T20:00:00Z"),
    attempt("delta-1", "2026-10-26", "2026-10-26T20:00:00Z"),
    attempt("archive", "archive:puzzle", "2026-10-27T20:00:00Z"),
  ];
  const { store, states } = memoryStore(rows);

  const result = await runJourneyProgressBackfill({
    store,
    batchSize: 2,
    cutoffAt: new Date("2026-10-26T00:00:00Z"),
    now: () => new Date("2026-10-28T00:00:00Z"),
  });

  expect(result).toMatchObject({ usersCompleted: 2, processed: 3, inserted: 3, skipped: 0 });
  expect(states.get("user-1")?.status).toBe("complete");
  expect(states.get("user-2")?.status).toBe("complete");
});

it("resumes an interrupted batch from its last fully committed cursor", async () => {
  const rows = [
    attempt("first", "2026-10-24", "2026-10-24T20:00:00Z"),
    attempt("second", "2026-10-25", "2026-10-25T20:00:00Z"),
  ];
  const { store, states, materialized, failFor } = memoryStore(rows);
  failFor.add("second");
  const options = {
    store,
    batchSize: 1,
    cutoffAt: new Date("2026-10-26T00:00:00Z"),
    now: () => new Date("2026-10-28T00:00:00Z"),
  };

  await expect(runJourneyProgressBackfill(options)).rejects.toThrow("temporary Mongo failure");
  expect(states.get("user-1")).toMatchObject({
    status: "scanning",
    cursorPuzzleDate: "2026-10-24",
  });
  expect(materialized).toEqual(new Set(["user-1:2026-10-24"]));

  const result = await runJourneyProgressBackfill(options);
  expect(result.usersCompleted).toBe(2);
  expect(materialized).toEqual(new Set(["user-1:2026-10-24", "user-1:2026-10-25"]));
  expect(states.get("user-1")?.status).toBe("complete");
});
