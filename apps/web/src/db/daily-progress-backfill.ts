import type { DailyProgress, DailyProgressBackfillState, PuzzleAttempt } from "./models";
import { dailyProgressBackfillOps, dailyProgressOps } from "./operations";

export interface JourneyBackfillStore {
  listUsersAfter(afterId: string | null, limit: number): Promise<Array<{ id: string }>>;
  listPendingReconciliationUsersAfter?(
    afterId: string | null,
    limit: number
  ): Promise<Array<{ id: string }>>;
  findState(userId: string): Promise<DailyProgressBackfillState | null>;
  ensureState(userId: string, cutoffAt: Date, updatedAt: Date): Promise<DailyProgressBackfillState>;
  findInitialBatch(
    userId: string,
    cutoffAt: Date,
    cursorPuzzleDate: string | undefined,
    limit: number
  ): Promise<PuzzleAttempt[]>;
  findDeltaBatch(
    userId: string,
    cutoffAt: Date,
    deltaCutoffAt: Date,
    cursorAttemptedAt: Date | undefined,
    cursorAttemptId: string | undefined,
    limit: number
  ): Promise<PuzzleAttempt[]>;
  saveState(state: DailyProgressBackfillState): Promise<void>;
  materialize(
    attempt: PuzzleAttempt
  ): Promise<{ progress: DailyProgress | null; inserted: boolean }>;
}

export interface JourneyBackfillResult {
  usersCompleted: number;
  processed: number;
  inserted: number;
  skipped: number;
  errors: number;
}

const defaultStore: JourneyBackfillStore = {
  ...dailyProgressBackfillOps,
  async materialize(attempt) {
    return dailyProgressOps.materializeFromAttemptWithStatus(attempt);
  },
};

/**
 * Resumably projects historical final daily attempts. Every cursor advances
 * only after the full batch succeeds, so an interrupted batch safely replays.
 */
export async function runJourneyProgressBackfill(
  options: {
    store?: JourneyBackfillStore;
    onlyReconciliationPending?: boolean;
    batchSize?: number;
    cutoffAt?: Date;
    now?: () => Date;
    onProgress?: (result: JourneyBackfillResult & { userId: string; status: string }) => void;
  } = {}
): Promise<JourneyBackfillResult> {
  const store = options.store ?? defaultStore;
  const batchSize = options.batchSize ?? 250;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Journey backfill batch size must be a positive integer");
  }
  const now = options.now ?? (() => new Date());
  const initialCutoffAt = options.cutoffAt ?? now();
  const result: JourneyBackfillResult = {
    usersCompleted: 0,
    processed: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  const applyBatch = async (userId: string, attempts: PuzzleAttempt[]) => {
    for (const attempt of attempts) {
      try {
        const materialized = await store.materialize(attempt);
        if (materialized.progress) {
          result.processed += 1;
          if (materialized.inserted) result.inserted += 1;
        } else {
          result.skipped += 1;
        }
      } catch (error) {
        result.errors += 1;
        options.onProgress?.({ ...result, userId, status: "error" });
        throw error;
      }
    }
  };

  let userCursor: string | null = null;
  while (true) {
    let users: Array<{ id: string }> | undefined;
    if (options.onlyReconciliationPending) {
      users = await store.listPendingReconciliationUsersAfter?.(userCursor, batchSize);
    } else {
      users = await store.listUsersAfter(userCursor, batchSize);
    }
    if (!users) {
      throw new Error("The backfill store cannot list pending reconciliation accounts");
    }
    if (users.length === 0) break;

    for (const user of users) {
      let state = await store.findState(user.id);
      const reconciliationGeneration = state?.reconciliationGeneration ?? 0;
      const reconciliationProcessedGeneration = state?.reconciliationProcessedGeneration ?? 0;
      const legacyTimestampPending = Boolean(
        state?.reconciliationRequestedAt &&
          (!state.reconciliationProcessedAt ||
            state.reconciliationRequestedAt > state.reconciliationProcessedAt)
      );
      const reconciliationPending =
        reconciliationGeneration > reconciliationProcessedGeneration ||
        (reconciliationGeneration === 0 && legacyTimestampPending);
      const reconciliationToProcess = reconciliationPending
        ? {
            // Legacy timestamp-only markers are generation zero. Keeping that
            // baseline distinct from the first $inc prevents a request that
            // arrives during the replay from being mistaken as already done.
            generation: reconciliationGeneration,
            requestedAt: state?.reconciliationRequestedAt ?? now(),
          }
        : undefined;
      const needsReconciliationRestart =
        reconciliationPending &&
        (state?.status === "complete" ||
          state?.reconciliationStartedGeneration !== reconciliationToProcess?.generation);
      if (state && needsReconciliationRestart) {
        state = {
          ...state,
          status: "scanning",
          cutoffAt: reconciliationToProcess!.requestedAt,
          cursorPuzzleDate: undefined,
          deltaCutoffAt: undefined,
          deltaCursorAttemptedAt: undefined,
          deltaCursorAttemptId: undefined,
          reconciliationStartedGeneration: reconciliationToProcess!.generation,
        };
        await store.saveState(state);
      }
      if (state?.status === "complete") {
        result.usersCompleted += 1;
        continue;
      }
      state ??= await store.ensureState(user.id, initialCutoffAt, now());

      while (state.status !== "complete") {
        if (state.status === "scanning") {
          const batch = await store.findInitialBatch(
            user.id,
            state.cutoffAt,
            state.cursorPuzzleDate,
            batchSize
          );
          await applyBatch(user.id, batch);

          state =
            batch.length < batchSize
              ? {
                  ...state,
                  status: "delta",
                  deltaCutoffAt: now(),
                  deltaCursorAttemptedAt: undefined,
                  deltaCursorAttemptId: undefined,
                  updatedAt: now(),
                }
              : {
                  ...state,
                  cursorPuzzleDate: batch[batch.length - 1]!.puzzleDate,
                  updatedAt: now(),
                };
          await store.saveState(state);
          options.onProgress?.({ ...result, userId: user.id, status: state.status });
          continue;
        }

        const deltaCutoffAt: Date = state.deltaCutoffAt ?? now();
        const batch = await store.findDeltaBatch(
          user.id,
          state.cutoffAt,
          deltaCutoffAt,
          state.deltaCursorAttemptedAt,
          state.deltaCursorAttemptId,
          batchSize
        );
        await applyBatch(user.id, batch);

        state =
          batch.length < batchSize
            ? {
                ...state,
                status: "complete",
                deltaCutoffAt,
                ...(reconciliationToProcess
                  ? {
                      reconciliationProcessedGeneration: reconciliationToProcess.generation,
                      reconciliationProcessedAt: reconciliationToProcess.requestedAt,
                    }
                  : {}),
                updatedAt: now(),
              }
            : {
                ...state,
                status: "delta",
                deltaCutoffAt,
                deltaCursorAttemptedAt: batch[batch.length - 1]!.attemptedAt,
                deltaCursorAttemptId: batch[batch.length - 1]!.id,
                updatedAt: now(),
              };
        await store.saveState(state);
        options.onProgress?.({ ...result, userId: user.id, status: state.status });
      }

      result.usersCompleted += 1;
    }

    userCursor = users[users.length - 1]!.id;
    if (users.length < batchSize) break;
  }

  return result;
}
