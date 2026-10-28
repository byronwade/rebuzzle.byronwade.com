import type { DailyProgressBackfillState } from "@/db/models";

export type DailyProgressBackfillStatus = "not_started" | "in_progress" | "complete" | "failed";

export function getDailyProgressBackfillStatus(
  state: DailyProgressBackfillState | null,
  finalAttemptCount: number,
  progressCount: number
): DailyProgressBackfillStatus {
  const reconciliationPending = state
    ? state.reconciliationGeneration !== undefined
      ? state.reconciliationGeneration > (state.reconciliationProcessedGeneration ?? 0)
      : Boolean(
          state.reconciliationRequestedAt &&
            (!state.reconciliationProcessedAt ||
              state.reconciliationRequestedAt > state.reconciliationProcessedAt)
        )
    : false;
  if (reconciliationPending) return "in_progress";
  if (state?.status === "complete") {
    return finalAttemptCount > progressCount ? "in_progress" : "complete";
  }
  if (state?.status === "scanning" || state?.status === "delta") return "in_progress";
  if (state) return "failed";
  return finalAttemptCount <= progressCount ? "complete" : "not_started";
}
