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
    async listPendingReconciliationUsersAfter(afterId, limit) {
      return [...states.values()]
        .filter(
          (state) =>
            state.userId > (afterId ?? "") &&
            ((state.reconciliationGeneration ?? 0) >
              (state.reconciliationProcessedGeneration ?? 0) ||
              (!state.reconciliationGeneration &&
                state.reconciliationRequestedAt &&
                (!state.reconciliationProcessedAt ||
                  state.reconciliationRequestedAt > state.reconciliationProcessedAt)))
        )
        .sort((a, b) => a.userId.localeCompare(b.userId))
        .slice(0, limit)
        .map((state) => ({ id: state.userId }));
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

it("restarts a completed checkpoint from the beginning when reconciliation is pending", async () => {
  const rows = [
    attempt("old-1", "2026-10-24", "2026-10-24T20:00:00Z"),
    attempt("old-2", "2026-10-25", "2026-10-25T20:00:00Z"),
  ];
  const { store, states, materialized } = memoryStore(rows);
  const reconciliationRequestedAt = new Date("2026-10-28T00:00:00Z");
  states.set("user-1", {
    _id: "user-1",
    userId: "user-1",
    status: "complete",
    cutoffAt: new Date("2026-10-27T00:00:00Z"),
    updatedAt: new Date("2026-10-27T00:00:00Z"),
    reconciliationRequestedAt,
    reconciliationGeneration: 1,
  });

  const result = await runJourneyProgressBackfill({
    store,
    batchSize: 1,
    now: () => new Date("2026-10-29T00:00:00Z"),
  });

  expect(result.processed).toBe(2);
  expect(materialized).toEqual(new Set(["user-1:2026-10-24", "user-1:2026-10-25"]));
  expect(states.get("user-1")).toMatchObject({
    status: "complete",
    reconciliationRequestedAt,
    reconciliationGeneration: 1,
    reconciliationProcessedGeneration: 1,
    reconciliationProcessedAt: reconciliationRequestedAt,
  });
});

it("resumes an interrupted reconciliation from its last saved page", async () => {
  const rows = [
    attempt("old-1", "2026-10-24", "2026-10-24T20:00:00Z"),
    attempt("old-2", "2026-10-25", "2026-10-25T20:00:00Z"),
  ];
  const { store, states, materialized, failFor } = memoryStore(rows);
  const reconciliationRequestedAt = new Date("2026-10-28T00:00:00Z");
  states.set("user-1", {
    _id: "user-1",
    userId: "user-1",
    status: "complete",
    cutoffAt: new Date("2026-10-27T00:00:00Z"),
    updatedAt: new Date("2026-10-27T00:00:00Z"),
    reconciliationRequestedAt,
    reconciliationGeneration: 1,
  });
  failFor.add("old-2");
  const options = { store, batchSize: 1, now: () => new Date("2026-10-29T00:00:00Z") };

  await expect(runJourneyProgressBackfill(options)).rejects.toThrow("temporary Mongo failure");
  expect(states.get("user-1")).toMatchObject({
    status: "scanning",
    cursorPuzzleDate: "2026-10-24",
    reconciliationStartedGeneration: 1,
  });

  const result = await runJourneyProgressBackfill(options);

  expect(result.processed).toBe(1);
  expect(materialized).toEqual(new Set(["user-1:2026-10-24", "user-1:2026-10-25"]));
  expect(states.get("user-1")).toMatchObject({
    status: "complete",
    reconciliationRequestedAt,
    reconciliationGeneration: 1,
    reconciliationProcessedGeneration: 1,
    reconciliationProcessedAt: reconciliationRequestedAt,
  });
});

it("runs only users with pending reconciliation markers when requested", async () => {
  const rows = [
    attempt("old-1", "2026-10-24", "2026-10-24T20:00:00Z"),
    attempt("old-2", "2026-10-25", "2026-10-25T20:00:00Z"),
  ];
  const { store, states, materialized } = memoryStore(rows);
  states.set("user-1", {
    _id: "user-1",
    userId: "user-1",
    status: "complete",
    cutoffAt: new Date("2026-10-23T00:00:00Z"),
    updatedAt: new Date("2026-10-27T00:00:00Z"),
    reconciliationRequestedAt: new Date("2026-10-28T00:00:00Z"),
    reconciliationGeneration: 1,
  });
  states.set("user-2", {
    _id: "user-2",
    userId: "user-2",
    status: "complete",
    cutoffAt: new Date("2026-10-23T00:00:00Z"),
    updatedAt: new Date("2026-10-27T00:00:00Z"),
  });
  const listPending = jest.spyOn(store, "listPendingReconciliationUsersAfter");

  const result = await runJourneyProgressBackfill({
    store,
    onlyReconciliationPending: true,
    now: () => new Date("2026-10-29T00:00:00Z"),
  });

  expect(listPending).toHaveBeenCalled();
  expect(result.usersCompleted).toBe(1);
  expect(materialized).toEqual(new Set(["user-1:2026-10-24", "user-1:2026-10-25"]));
  expect(states.get("user-2")?.status).toBe("complete");
});

it("keeps a new request pending after replaying a legacy timestamp-only marker", async () => {
  const rows = [attempt("legacy", "2026-10-24", "2026-10-24T20:00:00Z")];
  const { store, states, materialized } = memoryStore(rows);
  const originalRequestAt = new Date("2026-10-28T00:00:00Z");
  states.set("user-1", {
    _id: "user-1",
    userId: "user-1",
    status: "complete",
    cutoffAt: new Date("2026-10-27T00:00:00Z"),
    updatedAt: new Date("2026-10-27T00:00:00Z"),
    reconciliationRequestedAt: originalRequestAt,
  });

  await runJourneyProgressBackfill({
    store,
    onlyReconciliationPending: true,
    now: () => new Date("2026-10-29T00:00:00Z"),
  });
  const processed = states.get("user-1")!;
  expect(processed).toMatchObject({
    status: "complete",
    reconciliationProcessedGeneration: 0,
    reconciliationProcessedAt: originalRequestAt,
  });

  const nextRequestAt = new Date("2026-10-30T00:00:00Z");
  states.set("user-1", {
    ...processed,
    reconciliationGeneration: 1,
    reconciliationRequestedAt: nextRequestAt,
  });
  const nextRun = await runJourneyProgressBackfill({
    store,
    onlyReconciliationPending: true,
    now: () => new Date("2026-10-31T00:00:00Z"),
  });

  expect(nextRun.usersCompleted).toBe(1);
  expect(nextRun.processed).toBe(1);
  expect(materialized).toEqual(new Set(["user-1:2026-10-24"]));
  expect(states.get("user-1")).toMatchObject({
    reconciliationGeneration: 1,
    reconciliationProcessedGeneration: 1,
    reconciliationProcessedAt: nextRequestAt,
  });
});
