jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn() } }));
jest.mock("../candidate-record", () => ({ snapshotCandidate: jest.fn() }));

import { getCollection } from "@/db/mongodb";
import { snapshotCandidate } from "../candidate-record";
import { recordTournamentCandidates } from "../candidate-store";

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REBUZZLE_DIAGNOSTIC_READ_ONLY;
});
afterAll(() => {
  delete process.env.REBUZZLE_DIAGNOSTIC_READ_ONLY;
});
it("does not persist tournament candidates in diagnostic read-only mode", async () => {
  process.env.REBUZZLE_DIAGNOSTIC_READ_ONLY = "1";
  await recordTournamentCandidates({
    runId: "diagnostic",
    candidates: [{ id: "candidate" } as never],
  });
  expect(snapshotCandidate).not.toHaveBeenCalled();
  expect(getCollection).not.toHaveBeenCalled();
});
it("does not touch the database for empty tournaments", async () => {
  await recordTournamentCandidates({ runId: "empty", candidates: [] });
  expect(getCollection).not.toHaveBeenCalled();
});
it("does not turn database failures into publication failures", async () => {
  jest.mocked(snapshotCandidate).mockReturnValue({ id: "captured" } as never);
  const bulkWrite = jest.fn().mockRejectedValue(new Error("Database unavailable"));
  jest.mocked(getCollection).mockReturnValue({ bulkWrite } as never);
  await expect(
    recordTournamentCandidates({ runId: "run", candidates: [{} as never] })
  ).resolves.toBeUndefined();
  expect(bulkWrite).toHaveBeenCalledTimes(1);
});
it("uses immutable identifiers and insert-only updates", async () => {
  const row = { id: "captured", blueprint: { answer: "original" } };
  jest.mocked(snapshotCandidate).mockReturnValue(row as never);
  const bulkWrite = jest.fn().mockResolvedValue({});
  jest.mocked(getCollection).mockReturnValue({ bulkWrite } as never);
  await recordTournamentCandidates({
    runId: "run",
    candidates: [{ id: "candidate" } as never],
    winnerId: "candidate",
  });
  expect(snapshotCandidate).toHaveBeenCalledWith({ id: "candidate" }, "run", true);
  expect(bulkWrite).toHaveBeenCalledWith(
    [{ updateOne: { filter: { _id: "captured" }, update: { $setOnInsert: row }, upsert: true } }],
    { ordered: false }
  );
});
