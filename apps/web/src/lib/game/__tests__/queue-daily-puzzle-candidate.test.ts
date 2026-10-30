import type { DailyPuzzleCandidate } from "@/db/models";
import type { DailyPuzzleCandidateRepository } from "../daily-puzzle-candidate-repository";
import {
  createDailyPuzzleCandidateQueue,
  type DailyPuzzleCandidatePlaytestSubmitter,
} from "../queue-daily-puzzle-candidate";

const visual = {
  mode: "composed" as const,
  styleId: "ink-pictogram-v1" as const,
  layout: "row" as const,
  unicodeFallback: "T E E F",
  layers: [{ kind: "text" as const, content: "TEEF", emphasis: "normal" as const }],
};

const payload: DailyPuzzleCandidate["payload"] = {
  puzzleDisplay: "T E E F",
  puzzleType: "rebus",
  answer: "two left feet",
  difficulty: 7,
  category: "phrases_and_idioms",
  explanation: "Read the two reversed feet from left to right.",
  hints: ["Look at the direction", "Read each word", "Count the pair"],
  aiGenerated: true,
  rebusPuzzle: "T E E F",
  visual,
  metadataExtra: {
    techniqueId: "reversal-count",
    difficultyLevel: "Hard",
    generationMethod: "apex-tournament",
    estimatedSolveRate: 0.42,
  },
};

function memoryRepository() {
  const rows: DailyPuzzleCandidate[] = [];
  const repository: Pick<
    DailyPuzzleCandidateRepository,
    | "insert"
    | "findById"
    | "findByGenerationKey"
    | "list"
    | "markPlaytestSubmitted"
    | "markPlaytestSubmissionFailed"
  > = {
    async insert(candidate) {
      const existing = rows.find((row) => row.generationKey === candidate.generationKey);
      if (existing) return existing;
      rows.push(candidate);
      return candidate;
    },
    async findById(id) {
      return rows.find((row) => row.id === id) ?? null;
    },
    async findByGenerationKey(key) {
      return rows.find((row) => row.generationKey === key) ?? null;
    },
    async list(input = {}) {
      return rows.filter(
        (row) =>
          (!input.statuses?.length || input.statuses.includes(row.status)) &&
          (!input.withoutPlaytestSubmission || !row.playtestSubmittedAt)
      );
    },
    async markPlaytestSubmitted({ id, submittedAt }) {
      const row = rows.find((item) => item.id === id);
      if (!row || row.status !== "reviewing") return null;
      row.playtestSubmittedAt = submittedAt;
      row.playtestSubmissionError = undefined;
      return row;
    },
    async markPlaytestSubmissionFailed({ id, message, updatedAt }) {
      const row = rows.find((item) => item.id === id);
      if (!row || row.status !== "reviewing") return null;
      row.playtestSubmissionError = message;
      row.updatedAt = updatedAt;
      return row;
    },
  };
  return { repository, rows };
}

describe("queueing daily puzzles for human playtesting", () => {
  const now = new Date("2026-10-28T12:00:00.000Z");
  let memory: ReturnType<typeof memoryRepository>;
  let submitCandidate: jest.MockedFunction<
    DailyPuzzleCandidatePlaytestSubmitter["submitCandidate"]
  >;
  let queue: ReturnType<typeof createDailyPuzzleCandidateQueue>;

  beforeEach(() => {
    memory = memoryRepository();
    submitCandidate = jest.fn().mockResolvedValue(undefined);
    queue = createDailyPuzzleCandidateQueue(memory.repository, { submitCandidate }, () => now);
  });

  it("stores the complete puzzle privately and submits its exact board to blind review", async () => {
    const candidate = await queue.enqueue({
      generationKey: "2026-10-29",
      payload,
    });

    expect(candidate).toMatchObject({
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "reviewing",
      payload,
      playtestSubmittedAt: now,
    });
    expect(submitCandidate).toHaveBeenCalledWith({
      puzzleId: candidate.id,
      answer: payload.answer,
      visual,
      difficultyScore: 7,
      techniqueId: "reversal-count",
      difficultyLevel: "Hard",
      generationMethod: "apex-tournament",
      automatedEstimatedSolveRate: 0.42,
    });
  });

  it("returns an existing generation-date candidate without creating or re-submitting it", async () => {
    await queue.enqueue({ generationKey: "2026-10-29", payload });
    submitCandidate.mockClear();

    const retry = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(memory.rows).toHaveLength(1);
    expect(submitCandidate).not.toHaveBeenCalled();
    expect(retry.id).toBe(memory.rows[0]?.id);
  });

  it("retains a failed submission for a bounded retry instead of treating it as reviewed", async () => {
    submitCandidate.mockRejectedValueOnce(new Error("playtest service unavailable"));

    await expect(queue.enqueue({ generationKey: "2026-10-29", payload })).rejects.toThrow(
      "playtest service unavailable"
    );
    expect(memory.rows[0]).toMatchObject({
      status: "reviewing",
      playtestSubmissionError: "playtest service unavailable",
    });
    expect(memory.rows[0]?.playtestSubmittedAt).toBeUndefined();

    submitCandidate.mockResolvedValueOnce(undefined);
    await expect(queue.retryPending()).resolves.toEqual({
      attempted: 1,
      submitted: 1,
      failed: 0,
    });
    expect(memory.rows[0]?.playtestSubmittedAt).toEqual(now);
  });

  it("refuses to queue a daily rebus without the exact composed visual board", async () => {
    await expect(
      queue.enqueue({
        generationKey: "2026-10-29",
        payload: { ...payload, visual: undefined },
      })
    ).rejects.toThrow("validated visual board");
    expect(memory.rows).toHaveLength(0);
    expect(submitCandidate).not.toHaveBeenCalled();
  });
});
