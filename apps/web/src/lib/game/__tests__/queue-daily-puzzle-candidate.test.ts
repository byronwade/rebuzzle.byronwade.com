import { compileCanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-board";
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
    | "replacePayloadForReview"
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
    async replacePayloadForReview({ id, expectedStatusVersion, payload: nextPayload, updatedAt }) {
      const row = rows.find(
        (item) =>
          item.id === id &&
          item.status === "reviewing" &&
          item.statusVersion === expectedStatusVersion &&
          !item.playtestSubmittedAt
      );
      if (!row) return null;
      row.payload = nextPayload;
      row.updatedAt = updatedAt;
      row.statusVersion += 1;
      return row;
    },
    async markPlaytestSubmitted({ id, submittedAt }) {
      const row = rows.find((item) => item.id === id);
      if (row?.status !== "reviewing") return null;
      row.playtestSubmittedAt = submittedAt;
      row.playtestSubmissionError = undefined;
      return row;
    },
    async markPlaytestSubmissionFailed({ id, message, updatedAt }) {
      const row = rows.find((item) => item.id === id);
      if (row?.status !== "reviewing") return null;
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
      payload: {
        ...payload,
        visual: { ...visual, canonicalBoard: await compileCanonicalBoard(visual) },
      },
      playtestSubmittedAt: now,
    });
    expect(submitCandidate).toHaveBeenCalledWith({
      puzzleId: candidate.id,
      answer: payload.answer,
      visual: candidate.payload.visual,
      difficultyScore: 7,
      techniqueId: "reversal-count",
      difficultyLevel: "Hard",
      generationMethod: "apex-tournament",
      automatedEstimatedSolveRate: 0.42,
    });
  });

  it("adds the canonical artwork to an existing unsubmitted review candidate before submitting it", async () => {
    const legacyCandidate: DailyPuzzleCandidate = {
      id: "existing-candidate",
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "reviewing",
      statusVersion: 4,
      payload,
      createdAt: now,
      updatedAt: now,
    };
    memory.rows.push(legacyCandidate);

    const candidate = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(candidate.statusVersion).toBe(5);
    expect(candidate.payload.visual?.canonicalBoard).toEqual(await compileCanonicalBoard(visual));
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ visual: candidate.payload.visual })
    );
  }, 30_000);

  it("does not modify a candidate after its board has entered blind review", async () => {
    const submittedAt = new Date("2026-10-28T11:00:00.000Z");
    const legacyCandidate: DailyPuzzleCandidate = {
      id: "already-submitted",
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "reviewing",
      statusVersion: 4,
      payload,
      playtestSubmittedAt: submittedAt,
      createdAt: now,
      updatedAt: now,
    };
    memory.rows.push(legacyCandidate);

    const candidate = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(candidate).toBe(legacyCandidate);
    expect(candidate.payload).toBe(payload);
    expect(candidate.statusVersion).toBe(4);
    expect(submitCandidate).not.toHaveBeenCalled();
  });

  it("prepares a legacy pending candidate before retrying blind review", async () => {
    const legacyCandidate: DailyPuzzleCandidate = {
      id: "pending-legacy-candidate",
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "reviewing",
      statusVersion: 2,
      payload,
      createdAt: now,
      updatedAt: now,
    };
    memory.rows.push(legacyCandidate);

    await expect(queue.retryPending()).resolves.toEqual({
      attempted: 1,
      submitted: 1,
      failed: 0,
    });

    expect(legacyCandidate.statusVersion).toBe(3);
    expect(legacyCandidate.payload.visual?.canonicalBoard).toEqual(
      await compileCanonicalBoard(visual)
    );
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ visual: legacyCandidate.payload.visual })
    );
  }, 30_000);

  it("does not submit a stale board when its compare-and-set loses a race", async () => {
    const legacyCandidate: DailyPuzzleCandidate = {
      id: "racing-candidate",
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "reviewing",
      statusVersion: 2,
      payload,
      createdAt: now,
      updatedAt: now,
    };
    memory.rows.push(legacyCandidate);
    const replacePayloadForReview = memory.repository.replacePayloadForReview;
    const changedVisual = {
      ...visual,
      layers: [{ kind: "text" as const, content: "CHANGED", emphasis: "normal" as const }],
    };
    memory.repository.replacePayloadForReview = async ({ updatedAt }) => {
      legacyCandidate.payload = {
        ...legacyCandidate.payload,
        visual: changedVisual,
      };
      legacyCandidate.statusVersion += 1;
      legacyCandidate.updatedAt = updatedAt;
      return null;
    };

    const returned = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(returned.statusVersion).toBe(3);
    expect(returned.payload.visual).toEqual(changedVisual);
    expect(submitCandidate).not.toHaveBeenCalled();

    memory.repository.replacePayloadForReview = replacePayloadForReview;
    await expect(queue.retryPending()).resolves.toEqual({
      attempted: 1,
      submitted: 1,
      failed: 0,
    });
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: {
          ...changedVisual,
          canonicalBoard: await compileCanonicalBoard(changedVisual),
        },
      })
    );
  }, 30_000);

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
