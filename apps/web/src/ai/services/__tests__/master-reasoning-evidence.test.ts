jest.mock("../../config", () => ({
  AI_CONFIG: { puzzleAgent: { apex: { enabled: true, candidateCount: 2 } } },
}));
jest.mock("../../puzzle-agent/apex/engine", () => ({ runApexGeneration: jest.fn() }));
jest.mock("../../puzzle-agent/run-generation", () => ({ runPuzzleAgentGeneration: jest.fn() }));
jest.mock("../../puzzle-agent/apex/player-sim", () => ({
  applyPlayerSimHeuristics: jest.fn(),
  playerSimPublishBlockers: jest.fn(),
  simulatePlayerSolve: jest.fn(),
}));

import { runApexGeneration } from "../../puzzle-agent/apex/engine";
import { generateMasterPuzzle } from "../master-puzzle-orchestrator";

it("preserves independent reasoning evidence through the daily generation adapter", async () => {
  const reasoningEvidence = {
    version: "editorial-reasoning-v1",
    interacting: true,
    calibration: "editorial-unplaytested",
    finalInterpretation: "two left feet",
    operations: [
      { kind: "reversal", observation: "TEEF", inference: "left", necessary: true },
      { kind: "count", observation: "two copies", inference: "two", necessary: true },
    ],
  };
  jest.mocked(runApexGeneration).mockResolvedValue({
    puzzle: { answer: "two left feet" },
    metadata: { reasoningEvidence },
    status: "success",
    recommendations: [],
  } as never);
  const result = await generateMasterPuzzle({ targetDifficulty: 7 });
  expect(result.metadata).toEqual(expect.objectContaining({ reasoningEvidence }));
});
