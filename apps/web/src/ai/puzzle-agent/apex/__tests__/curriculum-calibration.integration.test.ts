const loadDiversitySnapshot = jest.fn();
const loadLearningDigest = jest.fn();
const loadAllAnswerKeys = jest.fn();
const loadTechniqueSolveRates = jest.fn();
const loadAnswerEloMap = jest.fn();
const samplePhraseBank = jest.fn();

jest.mock("../diversity-memory", () => ({
  loadDiversitySnapshot: (...args: unknown[]) => loadDiversitySnapshot(...args),
}));
jest.mock("../learning-context", () => ({
  loadLearningDigest: (...args: unknown[]) => loadLearningDigest(...args),
}));
jest.mock("../../../learning/answer-registry", () => ({
  loadAllAnswerKeys: (...args: unknown[]) => loadAllAnswerKeys(...args),
}));
jest.mock("../technique-calibration", () => {
  const actual = jest.requireActual(
    "../technique-calibration"
  ) as typeof import("../technique-calibration");
  return {
    ...actual,
    loadTechniqueSolveRates: (...args: unknown[]) => loadTechniqueSolveRates(...args),
  };
});
jest.mock("../elo-store", () => ({
  loadAnswerEloMap: (...args: unknown[]) => loadAnswerEloMap(...args),
}));
jest.mock("../phrase-bank", () => {
  const actual = jest.requireActual("../phrase-bank") as typeof import("../phrase-bank");
  return {
    ...actual,
    samplePhraseBank: (...args: unknown[]) => samplePhraseBank(...args),
  };
});

import { buildGenerationBrief } from "../curriculum";

describe("curriculum ← technique calibration integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadDiversitySnapshot.mockResolvedValue({
      recentAnswers: [],
      recentTechniques: [],
      recentCategories: [],
      overusedTechniques: [],
      underusedTechniques: [],
      bannedAnswerKeys: [],
      lookbackDays: 45,
    });
    loadAllAnswerKeys.mockResolvedValue([]);
    samplePhraseBank.mockReturnValue([
      {
        answer: "moonlight",
        category: "compound",
        difficultyHint: 5,
        techniqueAffinity: ["simple_compound"],
        visualCues: [{ kind: "catalog", concept: "moon", role: "word-part" }],
      },
    ]);
    loadTechniqueSolveRates.mockResolvedValue({
      lookbackDays: 45,
      sampleSize: 30,
      rates: [
        // Hard-tier families only — difficulty 5 cannot prefer Evil techniques.
        { techniqueId: "simple_compound", sampleSize: 12, solveRate: 0.95 },
        { techniqueId: "single_homophone", sampleSize: 10, solveRate: 0.28 },
        { techniqueId: "basic_positional", sampleSize: 8, solveRate: 0.5 },
        { techniqueId: "obvious_emoji_sum", sampleSize: 9, solveRate: 0.88 },
      ],
      notes: ["Loaded technique rates"],
    });
    loadAnswerEloMap.mockResolvedValue(new Map([["doorbell", 1625]]));
  });

  it("biases preferred techniques toward harder families when learning says too easy", async () => {
    loadLearningDigest.mockResolvedValue({
      enabled: true,
      avoidPatterns: [],
      preferPatterns: [],
      difficultyDriftNotes: [],
      sampleSize: 20,
      targetDifficultyDelta: 1,
      tooEasy: true,
      tooHard: false,
      medianSolveSeconds: 40,
      solveRate: 0.9,
    });

    const brief = await buildGenerationBrief({
      targetDifficulty: 5,
      useLearningFeedback: true,
    });

    expect(loadTechniqueSolveRates).toHaveBeenCalled();
    expect(loadAnswerEloMap).toHaveBeenCalled();
    // Lowest live solve rate in-tier should lead when the window is too easy.
    expect(brief.preferredTechniques[0]).toBe("single_homophone");
    expect(brief.preferredTechniques.at(-1)).toBe("simple_compound");
    expect(brief.answerEloByKey.get("doorbell")).toBe(1625);
    expect(brief.briefSummary).toMatch(/Technique calibration \(too easy\)/i);
    expect(brief.briefSummary).toMatch(/Pairwise answer Elo/i);
  });

  it("skips technique calibration load when learning feedback is disabled", async () => {
    const brief = await buildGenerationBrief({
      targetDifficulty: 5,
      useLearningFeedback: false,
    });
    expect(loadTechniqueSolveRates).not.toHaveBeenCalled();
    expect(loadAnswerEloMap).not.toHaveBeenCalled();
    expect(loadLearningDigest).not.toHaveBeenCalled();
    expect(brief.learning.enabled).toBe(false);
    expect(brief.answerEloByKey.size).toBe(0);
  });
});
