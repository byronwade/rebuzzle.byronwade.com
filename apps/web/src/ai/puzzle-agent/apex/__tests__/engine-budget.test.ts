const runPuzzleAgentGeneration = jest.fn();
const buildGenerationBrief = jest.fn();

jest.mock("../../run-generation", () => ({ runPuzzleAgentGeneration }));
jest.mock("../../tool-impl", () => ({ stableId: jest.fn(() => "candidate-id") }));
jest.mock("../curriculum", () => ({ buildGenerationBrief }));
jest.mock("../critique", () => ({ critiqueCandidate: jest.fn() }));
jest.mock("../player-sim", () => ({
  applyPlayerSimHeuristics: jest.fn(),
  playerSimPublishBlockers: jest.fn(() => []),
  simulatePlayerSolve: jest.fn(),
}));

import { AIBudgetExceededError } from "../../../errors";
import { runApexGeneration } from "../engine";

describe("Apex spending-cap behavior", () => {
  it("stops remaining tournament slots after the first hard budget error", async () => {
    buildGenerationBrief.mockResolvedValue({
      targetDifficulty: 5,
      tierLabel: "Medium",
      qualityThreshold: 74,
      minRubricOverall: 78,
      candidateCount: 2,
      preferredTechniques: ["simple_compound"],
      avoidTechniques: [],
      phraseSuggestions: [],
      diversity: { bannedAnswerKeys: [] },
      briefSummary: "test",
    });
    runPuzzleAgentGeneration.mockRejectedValue(new AIBudgetExceededError());

    await expect(runApexGeneration({ targetDifficulty: 5 })).rejects.toMatchObject({
      code: "AI_BUDGET_EXCEEDED",
    });
    expect(runPuzzleAgentGeneration).toHaveBeenCalledTimes(1);
  });
});
