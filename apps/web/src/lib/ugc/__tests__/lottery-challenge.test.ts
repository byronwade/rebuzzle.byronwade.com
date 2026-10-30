import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import { withStudioEvidence } from "@/test/studio-evidence";

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
  const submission = withStudioEvidence({
    id: "easy",
    puzzleId: "easy-board",
    answerKey: "earache",
    answer: "earache",
    techniqueId: "simple_compound",
    difficulty: 9,
    visual: {
      styleId: INK_PICTOGRAM_STYLE_ID,
      mode: "composed" as const,
      layout: "row" as const,
      layers: [],
      unicodeFallback: "EAR + ACHE",
    },
  });
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

it("rejects legacy or mismatched evidence before touching community puzzles", async () => {
  jest.mocked(ensureCommunityPuzzle).mockClear();
  const row = { id: "legacy", puzzleId: "legacy", answer: "legacy" };
  jest.mocked(submissionsCollection).mockReturnValue({
    find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [row] }) }) }),
  } as never);
  await expect(
    trySelectUgcLotteryFiller({ dateString: "2026-10-10", fallbackReason: "test" })
  ).resolves.toBeNull();
  expect(ensureCommunityPuzzle).not.toHaveBeenCalled();
});

it("checks the stored board's current asset approval before daily qualification", async () => {
  const submission = withStudioEvidence({
    id: "changed",
    puzzleId: "changed-board",
    answer: "clockwork",
    answerKey: "clockwork",
    techniqueId: "simple_compound",
    difficulty: 9,
    visual: {
      styleId: INK_PICTOGRAM_STYLE_ID,
      mode: "composed" as const,
      layout: "row" as const,
      layers: [],
      unicodeFallback: "clock work",
    },
  });
  jest.mocked(submissionsCollection).mockReturnValue({
    find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [submission] }) }) }),
  } as never);
  jest.mocked(ensureCommunityPuzzle).mockResolvedValue("changed-board");
  const visual = {
    ...submission.visual,
    layers: [
      {
        kind: "pictogram" as const,
        concept: "clock",
        emojiFallback: "clock",
        source: "generated" as const,
        svg: '<svg viewBox="0 0 64 64"></svg>',
      },
    ],
  };
  const updateOne = jest.fn();
  const difficulty = jest.fn(() => {
    throw new Error("Must reject assets before difficulty");
  });
  jest.mocked(getCollection).mockReturnValue({
    findOne: async () => ({
      id: "changed-board",
      answer: "clockwork",
      visual,
      get metadata() {
        difficulty();
        return {};
      },
    }),
    updateOne,
  } as never);
  await expect(
    trySelectUgcLotteryFiller({ dateString: "2026-10-10", fallbackReason: "test" })
  ).resolves.toBeNull();
  expect(difficulty).not.toHaveBeenCalled();
  expect(updateOne).not.toHaveBeenCalled();
});
