import * as progressRoute from "@/app/api/user/progress/route";
import type { DailyProgressBackfillState } from "@/db/models";

jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));

type Status = "complete" | "in_progress" | "failed" | "not_started";
type StatusFunction = (
  state: DailyProgressBackfillState | null,
  finalAttemptCount: number,
  progressCount: number
) => Status;

const statusFunction = (): StatusFunction => {
  const value = (progressRoute as unknown as { getDailyProgressBackfillStatus?: StatusFunction })
    .getDailyProgressBackfillStatus;
  expect(value).toEqual(expect.any(Function));
  return value!;
};

const state = (
  overrides: Partial<DailyProgressBackfillState> = {}
): DailyProgressBackfillState => ({
  _id: "user-1",
  userId: "user-1",
  status: "complete",
  cutoffAt: new Date("2026-10-28T12:00:00.000Z"),
  updatedAt: new Date("2026-10-28T12:00:00.000Z"),
  ...overrides,
});

it.each([
  ["no checkpoint and equal counts", null, 5, 5, "complete"],
  ["no checkpoint with a missing projection", null, 5, 4, "not_started"],
  ["an active scan", state({ status: "scanning" }), 5, 4, "in_progress"],
  ["a delta scan", state({ status: "delta" }), 5, 4, "in_progress"],
  ["an explicit failure", state({ status: "failed" as never }), 5, 4, "failed"],
  [
    "a finished scan whose reconciliation is pending",
    state({ reconciliationGeneration: 2 }),
    5,
    5,
    "in_progress",
  ],
  ["a complete scan with a missing projection", state(), 5, 4, "in_progress"],
  [
    "a complete scan after reconciliation",
    state({ reconciliationGeneration: 2, reconciliationProcessedGeneration: 2 }),
    5,
    5,
    "complete",
  ],
] as const)("returns the existing status for %s", (_name, backfill, finals, progress, expected) => {
  expect(statusFunction()(backfill, finals, progress)).toBe(expected);
});
