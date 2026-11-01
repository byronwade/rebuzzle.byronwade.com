import {
  type CanonicalBoard,
  validateCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-contract";
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

const compiledBoard: CanonicalBoard = {
  version: 1,
  pngDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  sha256: "a".repeat(64),
  width: 1,
  height: 1,
  sourceFingerprint: "b".repeat(64),
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
    | "recordCanonicalBoard"
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
    async recordCanonicalBoard(input) {
      const row = rows.find(
        (item) =>
          item.id === input.id &&
          item.statusVersion === input.expectedStatusVersion &&
          !item.playtestSubmittedAt &&
          (item.status === "reviewing" ||
            (item.status === "rejected" && item.rejectionReason === "canonical-board-failed"))
      );
      if (!row?.payload.visual) return null;
      row.statusVersion++;
      row.updatedAt = input.updatedAt;
      if ("canonicalBoard" in input) {
        row.status = "reviewing";
        row.payload = {
          ...row.payload,
          visual: { ...row.payload.visual, canonicalBoard: input.canonicalBoard },
        };
        row.rejectionReason = undefined;
        row.rejectionDetail = undefined;
      } else {
        const { canonicalBoard: _stale, ...visual } = row.payload.visual;
        row.status = "rejected";
        row.rejectionReason = "canonical-board-failed";
        row.rejectionDetail = input.failureDetail;
        row.payload = { ...row.payload, visual };
      }
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
  let compileBoard: jest.Mock;

  beforeEach(() => {
    memory = memoryRepository();
    submitCandidate = jest.fn().mockResolvedValue(undefined);
    compileBoard = jest.fn().mockResolvedValue(compiledBoard);
    queue = createDailyPuzzleCandidateQueue(
      memory.repository,
      { submitCandidate },
      () => now,
      compileBoard
    );
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
      visual: { ...visual, canonicalBoard: compiledBoard },
      difficultyScore: 7,
      techniqueId: "reversal-count",
      difficultyLevel: "Hard",
      generationMethod: "apex-tournament",
      automatedEstimatedSolveRate: 0.42,
    });
    expect(compileBoard).toHaveBeenCalledWith(visual);
  });

  it("returns an existing generation-date candidate without creating or re-submitting it", async () => {
    await queue.enqueue({ generationKey: "2026-10-29", payload });
    submitCandidate.mockClear();

    const retry = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(memory.rows).toHaveLength(1);
    expect(submitCandidate).not.toHaveBeenCalled();
    expect(retry.id).toBe(memory.rows[0]?.id);
    expect(compileBoard).toHaveBeenCalledTimes(1);
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
    expect(compileBoard).not.toHaveBeenCalled();
  });

  it("rejects a candidate whose board cannot compile instead of sending it to playtest", async () => {
    compileBoard.mockRejectedValueOnce(new Error("Unsupported canonical pictogram"));

    const candidate = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(candidate).toMatchObject({
      status: "rejected",
      rejectionReason: "canonical-board-failed",
    });
    expect(candidate.payload.visual?.canonicalBoard).toBeUndefined();
    expect(candidate.rejectionDetail).toBe("Unsupported canonical pictogram");
    expect(submitCandidate).not.toHaveBeenCalled();
    await expect(queue.retryPending()).resolves.toEqual({
      attempted: 0,
      submitted: 0,
      failed: 0,
    });
  });

  it("recompiles a date's board-failed candidate from its stored visual and submits it", async () => {
    compileBoard.mockRejectedValueOnce(new Error("transient sharp failure"));
    await queue.enqueue({ generationKey: "2026-10-29", payload });
    compileBoard.mockClear();

    const retry = await queue.enqueue({
      generationKey: "2026-10-29",
      payload: { ...payload, answer: "a different regeneration" },
    });

    expect(compileBoard).toHaveBeenCalledWith(visual);
    expect(memory.rows).toHaveLength(1);
    expect(retry).toMatchObject({ status: "reviewing", playtestSubmittedAt: now });
    expect(retry.rejectionReason).toBeUndefined();
    expect(retry.rejectionDetail).toBeUndefined();
    expect(retry.payload.answer).toBe(payload.answer);
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ visual: { ...visual, canonicalBoard: compiledBoard } })
    );
  });

  it("keeps a board-failed candidate rejected when the recompile fails again", async () => {
    compileBoard.mockRejectedValueOnce(new Error("first failure"));
    await queue.enqueue({ generationKey: "2026-10-29", payload });
    compileBoard.mockRejectedValueOnce(new Error("x".repeat(400)));

    const retry = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(retry).toMatchObject({
      status: "rejected",
      rejectionReason: "canonical-board-failed",
    });
    expect(retry.rejectionDetail).toHaveLength(300);
    expect(submitCandidate).not.toHaveBeenCalled();
  });

  it("does not recompile a candidate rejected for another reason", async () => {
    memory.rows.push({
      id: "skipped-1",
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "rejected",
      rejectionReason: "human-playtest-failed",
      statusVersion: 2,
      payload,
      createdAt: now,
      updatedAt: now,
    });

    const result = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(result.status).toBe("rejected");
    expect(compileBoard).not.toHaveBeenCalled();
    expect(submitCandidate).not.toHaveBeenCalled();
  });

  it("gives an unsubmitted candidate without a trusted board its board before submitting", async () => {
    memory.rows.push({
      id: "legacy-1",
      generationKey: "2026-10-29",
      policyVersion: "human-reviewed-daily-v1",
      status: "reviewing",
      statusVersion: 0,
      payload,
      createdAt: now,
      updatedAt: now,
    });

    const result = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(compileBoard).toHaveBeenCalledWith(visual);
    expect(result).toMatchObject({ id: "legacy-1", status: "reviewing", playtestSubmittedAt: now });
    expect(result.payload.visual?.canonicalBoard).toEqual(compiledBoard);
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        puzzleId: "legacy-1",
        visual: { ...visual, canonicalBoard: compiledBoard },
      })
    );
  });

  it("compiles the real checked board at queue time by default", async () => {
    const realQueue = createDailyPuzzleCandidateQueue(
      memory.repository,
      { submitCandidate },
      () => now
    );

    const candidate = await realQueue.enqueue({ generationKey: "2026-10-30", payload });

    const board = candidate.payload.visual?.canonicalBoard;
    expect(board).toBeDefined();
    await expect(validateCanonicalBoard(board)).resolves.toBeTruthy();
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ visual: expect.objectContaining({ canonicalBoard: board }) })
    );
  }, 30_000);
});
