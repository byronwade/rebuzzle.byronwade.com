jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/ai/learning/answer-registry", () => ({
  isAnswerRegistered: jest.fn(),
  normalizeAnswerKey: (answer: string) =>
    answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
}));
jest.mock("@/db", () => ({
  db: {
    puzzleOps: {
      findByDate: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { submitCandidate: jest.fn() },
}));

import { isAnswerRegistered } from "@/ai/learning/answer-registry";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
import { db } from "@/db";
import {
  type PersistDailyPuzzleInput,
  persistDailyPuzzle,
} from "../persist-daily-puzzle";

const input: PersistDailyPuzzleInput = {
  dateString: "2026-08-01",
  puzzleDisplay: "TEEF TEEF",
  puzzleType: "rebus",
  answer: "two left feet",
  difficulty: 7,
  category: "phrases_and_idioms",
  explanation: "Two copies of FEET read toward the left: two left feet.",
  hints: [
    "Read in a different direction",
    "Count what you find",
    "Which way do both feet read?",
  ],
  metadataExtra: {
    reasoningEvidenceSource: "curated",
    reasoningEvidence: {
      version: "editorial-reasoning-v1",
      operations: [
        {
          kind: "reversal",
          observation: "Each TEEF spells FEET toward the left.",
          inference: "Recover FEET and the direction left.",
          necessary: true,
        },
        {
          kind: "count",
          observation: "Two reversed word groups are visible.",
          inference: "The pair supplies two in the final idiom.",
          necessary: true,
        },
      ],
      interacting: true,
      finalInterpretation: "two left feet",
      calibration: "editorial-unplaytested",
    },
  },
  aiGenerated: false,
  rebusPuzzle: "TEEF TEEF",
  visual: {
    mode: "composed",
    layout: "row",
    unicodeFallback: "TEEF TEEF",
    layers: [
      { kind: "text", content: "TEEF", emphasis: "normal" },
      { kind: "text", content: "TEEF", emphasis: "normal" },
    ],
  },
};

const findByDate = jest.mocked(db.puzzleOps.findByDate);
const create = jest.mocked(db.puzzleOps.create);
const answerRegistered = jest.mocked(isAnswerRegistered);
const submitPlaytestCandidate = jest.mocked(
  puzzlePlaytestService.submitCandidate,
);

const humanPlaytestAdmission = {
  policyVersion: "human-reviewed-daily-v1" as const,
  candidateId: "daily-candidate-1",
  contractVersion: "puzzle-playtest-v3",
  qualifiedDecisions: 20,
  profileCoverage: [
    { profileId: "compact-320", decisions: 5 },
    { profileId: "mobile-375", decisions: 5 },
    { profileId: "mobile-375-medium", decisions: 5 },
    { profileId: "desktop-768", decisions: 5 },
  ],
  correct: 15,
  solveRate: 0.75,
  solveRateLowerBound: 0.52,
  expectedSolveFloor: 0.35,
  ambiguityReports: 1,
  visualFailureReports: 0,
  admittedAt: "2026-10-28T00:00:00.000Z",
};

describe("daily puzzle publication locks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findByDate.mockResolvedValue(null);
    answerRegistered.mockResolvedValue({ taken: false });
    create.mockImplementation(async (puzzle) => puzzle as never);
  });

  it("rejects literal picture-name addition even when declared difficulty is nine", async () => {
    await expect(
      persistDailyPuzzle({
        ...input,
        difficulty: 9,
        answer: "firetruck",
        metadataExtra: {
          ...input.metadataExtra,
          reasoningEvidence: {
            ...(input.metadataExtra!.reasoningEvidence as object),
            finalInterpretation: "firetruck",
          },
        },
        visual: {
          mode: "composed",
          layout: "row",
          unicodeFallback: "FIRE + TRUCK",
          layers: [
            { kind: "text", content: "FIRE", emphasis: "normal" },
            { kind: "operator", symbol: "+" },
            { kind: "text", content: "TRUCK", emphasis: "normal" },
          ],
        },
      }),
    ).rejects.toThrow("Daily challenge");
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps an already published easy puzzle stable under the new policy", async () => {
    findByDate.mockResolvedValue({ id: "already-playing" } as never);
    await expect(
      persistDailyPuzzle({ ...input, difficulty: 4 }),
    ).resolves.toEqual({
      id: "already-playing",
      alreadyExisted: true,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses every duplicate answer without an emergency bypass", async () => {
    answerRegistered.mockResolvedValue({
      taken: true,
      puzzleId: "archived-puzzle",
    });

    await expect(persistDailyPuzzle(input)).rejects.toThrow(
      "Refusing to persist duplicate answer",
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("fails closed when the answer archive cannot be checked", async () => {
    answerRegistered.mockRejectedValue(new Error("archive offline"));

    await expect(persistDailyPuzzle(input)).rejects.toThrow("archive offline");
    expect(create).not.toHaveBeenCalled();
  });

  it("writes immutable answer and daily-publication lock keys", async () => {
    await persistDailyPuzzle({
      ...input,
      metadataExtra: {
        ...input.metadataExtra,
        answerKey: "attempted-override",
        uniquenessContract: "attempted-override",
        dailyPublicationKey: "1900-01-01",
      },
    });

    const saved = create.mock.calls[0]?.[0];
    expect(saved?.metadata?.answerKey).toBe("twoleftfeet");
    expect(saved?.metadata?.uniquenessContract).toBe("archive-v1");
    expect(saved?.metadata?.dailyPublicationKey).toBe("2026-08-01");
  });

  it("returns the winning row when concurrent publication hits the date lock", async () => {
    findByDate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "concurrent-winner" } as never);
    create.mockRejectedValue({ code: 11_000 });

    await expect(persistDailyPuzzle(input)).resolves.toEqual({
      id: "concurrent-winner",
      alreadyExisted: true,
    });
  });

  it("surfaces an answer-key race when no same-date winner exists", async () => {
    findByDate.mockResolvedValue(null);
    create.mockRejectedValue({ code: 11_000 });

    await expect(persistDailyPuzzle(input)).rejects.toThrow(
      "Concurrent publication used this answer",
    );
  });

  it("refuses to publish an AI-generated rebus without candidate-level human admission", async () => {
    await expect(
      persistDailyPuzzle({ ...input, aiGenerated: true, visual: input.visual }),
    ).rejects.toThrow("Human playtest admission is required");

    expect(create).not.toHaveBeenCalled();
    expect(submitPlaytestCandidate).not.toHaveBeenCalled();
  });

  it("records human admission and does not queue an already-reviewed board again", async () => {
    await persistDailyPuzzle({
      ...input,
      aiGenerated: true,
      visual: input.visual,
      humanPlaytestAdmission,
    });

    expect(create.mock.calls[0]?.[0]?.metadata?.humanPlaytestAdmission).toEqual(
      humanPlaytestAdmission,
    );
    expect(submitPlaytestCandidate).not.toHaveBeenCalled();
  });
});
