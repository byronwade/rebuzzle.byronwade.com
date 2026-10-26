jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));
jest.mock("../submissions", () => ({
  submissionsCollection: jest.fn(),
  ensureCommunityPuzzle: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));

import { getCollection } from "@/db/mongodb";
import { trySelectUgcLotteryFiller } from "../lottery";
import { ensureCommunityPuzzle, submissionsCollection } from "../submissions";

it("keeps an approved simple community puzzle out of the daily slot even with an inflated score", async () => {
  const updateOne = jest.fn();
  const submission = { id: "easy", puzzleId: "easy-board", answerKey: "earache" };
  const pool = {
    find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [submission] }) }) }),
  };
  jest.mocked(submissionsCollection).mockReturnValue(pool as never);
  jest.mocked(ensureCommunityPuzzle).mockResolvedValue("easy-board");
  jest.mocked(getCollection).mockReturnValue({
    findOne: async (query: { id?: string }) =>
      query.id
        ? {
            id: "easy-board",
            answer: "earache",
            difficulty: "hard",
            metadata: { difficultyScore: 9 },
            visual: {
              mode: "composed",
              layout: "row",
              unicodeFallback: "EAR + ACHE",
              layers: [
                { kind: "text", content: "EAR", emphasis: "normal" },
                { kind: "operator", symbol: "+" },
                { kind: "text", content: "ACHE", emphasis: "normal" },
              ],
            },
          }
        : null,
    updateOne,
  } as never);
  await expect(
    trySelectUgcLotteryFiller({ dateString: "2026-10-10", fallbackReason: "test" })
  ).resolves.toBeNull();
  expect(ensureCommunityPuzzle).toHaveBeenCalledWith(submission);
  expect(updateOne).not.toHaveBeenCalled();
});
