import type { Puzzle } from "@/db/models";
import { toPublicArchivePuzzle } from "../public-archive-puzzle";

it("returns only the safe archive presentation fields", () => {
  const puzzle = {
    id: "published-7",
    puzzle: "MIND over MATTER",
    rebusPuzzle: "MIND over MATTER",
    puzzleType: "phrase",
    difficulty: 7,
    hints: ["Look at the position of the words."],
    publishedAt: new Date("2025-02-03T12:00:00.000Z"),
    visual: { mode: "text", unicodeFallback: "MIND\nMATTER", layers: [] },
    aiGenerated: true,
    answer: "mind over matter",
    explanation: "MIND is positioned over MATTER.",
    reasoningEvidence: { winningChain: ["position", "over"] },
    metadata: { answerKey: "private", reviewEvidence: "private", puzzleType: "phrase" },
  } as unknown as Puzzle;

  const result = toPublicArchivePuzzle(puzzle) as unknown as Record<string, unknown>;

  expect(result).toMatchObject({
    id: "published-7",
    puzzle: "MIND over MATTER",
    puzzleType: "phrase",
    difficulty: 7,
    hints: ["Look at the position of the words."],
    date: "2025-02-03",
    aiGenerated: true,
  });
  for (const key of ["answer", "explanation", "reasoningEvidence", "playabilityEvidence"]) {
    expect(result).not.toHaveProperty(key);
  }
  expect(result).not.toHaveProperty("metadata");
});
