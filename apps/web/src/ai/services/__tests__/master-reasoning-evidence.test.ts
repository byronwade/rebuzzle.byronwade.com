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

import { AI_CONFIG } from "../../config";
import { runApexGeneration } from "../../puzzle-agent/apex/engine";
import { runPuzzleAgentGeneration } from "../../puzzle-agent/run-generation";
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

describe("bounded high-difficulty engine routing", () => {
  const minimalResult = {
    puzzle: { answer: "two left feet" },
    metadata: { playabilityEvidence: { source: "test" } },
    status: "success",
    recommendations: [],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(runApexGeneration).mockResolvedValue(minimalResult as never);
    jest.mocked(runPuzzleAgentGeneration).mockResolvedValue(minimalResult as never);
    AI_CONFIG.puzzleAgent.apex.enabled = true;
  });
  afterEach(() => {
    AI_CONFIG.puzzleAgent.apex.enabled = true;
  });

  it("keeps a one-candidate daily target in Apex without increasing its budget", async () => {
    const result = await generateMasterPuzzle({
      targetDifficulty: 7,
      candidateCount: 1,
      maxAttempts: 1,
    });
    expect(result.metadata.engine).toBe("apex");
    expect(runApexGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ targetDifficulty: 7, candidateCount: 1, maxAttempts: 1 })
    );
    expect(runPuzzleAgentGeneration).not.toHaveBeenCalled();
  });
  it("preserves classic routing for a one-candidate low tier", async () => {
    const result = await generateMasterPuzzle({ targetDifficulty: 5, candidateCount: 1 });
    expect(result.metadata.engine).toBe("eve");
    expect(runApexGeneration).not.toHaveBeenCalled();
  });
  it("respects an explicit disabled Apex configuration", async () => {
    AI_CONFIG.puzzleAgent.apex.enabled = false;
    const result = await generateMasterPuzzle({ targetDifficulty: 7, candidateCount: 1 });
    expect(result.metadata.engine).toBe("eve");
    expect(runApexGeneration).not.toHaveBeenCalled();
  });
});
