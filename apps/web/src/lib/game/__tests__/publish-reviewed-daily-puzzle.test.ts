import type {
  DailyPuzzleCandidate,
  DailyPuzzleCandidateHumanEvidence,
} from "@/db/models";
import {
  humanSolveFloorEvidence,
  PUZZLE_PLAYTEST_CONTRACT_VERSION,
  type PuzzlePlaytestCandidateAdmission,
} from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import type { DailyPuzzleCandidateRepository } from "../daily-puzzle-candidate-repository";
import {
  publishReviewedDailyPuzzle,
  type DailyCandidatePublisherReviewService,
} from "../publish-reviewed-daily-puzzle";

const PROFILE_IDS = [
  "compact-320",
  "mobile-375",
  "mobile-375-medium",
  "desktop-768",
] as const;
const payload: DailyPuzzleCandidate["payload"] = {
  puzzleDisplay: "T E E F",
  puzzleType: "rebus",
  answer: "two left feet",
  difficulty: 7,
  category: "phrases_and_idioms",
  explanation: "Read the clue twice, then count the pair.",
  hints: ["Look at direction", "Count the words"],
  aiGenerated: true,
  rebusPuzzle: "T E E F",
  visual: {
    mode: "composed",
    styleId: "ink-pictogram-v1",
    layout: "row",
    unicodeFallback: "T E E F",
    layers: [{ kind: "text", content: "TEEF", emphasis: "normal" }],
  },
};

function makeCandidate(
  status: DailyPuzzleCandidate["status"] = "reviewing",
  assignedDate?: string,
): DailyPuzzleCandidate {
  return {
    id: "candidate-1",
    generationKey: "2026-10-27",
    policyVersion: "human-reviewed-daily-v1",
    status,
    statusVersion: status === "reviewing" ? 0 : 1,
    payload,
    playtestSubmittedAt: new Date("2026-10-27T00:00:00Z"),
    assignedDate,
    createdAt: new Date("2026-10-27T00:00:00Z"),
    updatedAt: new Date("2026-10-27T00:00:00Z"),
  } as DailyPuzzleCandidate;
}

function admission(
  overrides: Partial<PuzzlePlaytestCandidateAdmission> = {},
): PuzzlePlaytestCandidateAdmission {
  return {
    puzzleId: "candidate-1",
    contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
    candidateStatus: "complete",
    eligible: true,
    requiredReviewersPerProfile: 5,
    profileCoverage: PROFILE_IDS.map((profileId) => ({
      profileId,
      decisions: 5,
    })),
    qualifiedDecisions: 20,
    solveEvidence: humanSolveFloorEvidence(20, 20, 7),
    ambiguityReports: 0,
    visualFailureReports: 0,
    reasons: [],
    generatedAt: "2026-10-28T00:00:00.000Z",
    ...overrides,
  };
}

function storedEvidence(): DailyPuzzleCandidateHumanEvidence {
  return {
    contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
    qualifiedDecisions: 20,
    profileCoverage: PROFILE_IDS.map((profileId) => ({
      profileId,
      decisions: 5,
    })),
    correct: 20,
    solveRate: 1,
    solveRateLowerBound: admission().solveEvidence.lower,
    expectedSolveFloor: 0.35,
    ambiguityReports: 0,
    visualFailureReports: 0,
    admittedAt: new Date(0).toISOString(),
  };
}

function memoryRepository(seed: DailyPuzzleCandidate[]) {
  const rows = seed;
  const repository: DailyPuzzleCandidateRepository = {
    async insert(candidate) {
      rows.push(candidate);
      return candidate;
    },
    async findById(id) {
      return rows.find((row) => row.id === id) ?? null;
    },
    async findByGenerationKey(key) {
      return rows.find((row) => row.generationKey === key) ?? null;
    },
    async findAssignmentForDate(date) {
      return rows.find((row) => row.assignedDate === date) ?? null;
    },
    async list(input = {}) {
      return rows.filter(
        (row) =>
          (!input.statuses?.length || input.statuses.includes(row.status)) &&
          (!input.withoutPlaytestSubmission || !row.playtestSubmittedAt),
      );
    },
    async markPlaytestSubmitted() {
      return null;
    },
    async markPlaytestSubmissionFailed() {
      return null;
    },
    async markReady({ id, expectedStatusVersion, updatedAt, humanEvidence }) {
      const row = rows.find(
        (candidate) =>
          candidate.id === id &&
          candidate.status === "reviewing" &&
          candidate.statusVersion === expectedStatusVersion,
      );
      if (!row) return null;
      Object.assign(row, {
        status: "ready",
        statusVersion: row.statusVersion + 1,
        humanEvidence,
        updatedAt,
      });
      return row;
    },
    async claimReadyForDate({ id, dateString }) {
      const assigned = rows.find((row) => row.assignedDate === dateString);
      if (assigned) return assigned;
      const row = rows.find(
        (candidate) => candidate.id === id && candidate.status === "ready",
      );
      if (!row) return null;
      Object.assign(row, {
        status: "assigned",
        statusVersion: row.statusVersion + 1,
        assignedDate: dateString,
      });
      return row;
    },
    async skip({ id, reason, updatedAt }) {
      const row = rows.find((candidate) => candidate.id === id);
      if (!row) return null;
      Object.assign(row, {
        status: "rejected",
        statusVersion: row.statusVersion + 1,
        rejectionReason: reason,
        assignedDate: undefined,
        updatedAt,
      });
      return row;
    },
    async markPublished({ id, dateString, puzzleId, updatedAt }) {
      const row = rows.find(
        (candidate) =>
          candidate.id === id &&
          candidate.status === "assigned" &&
          candidate.assignedDate === dateString,
      );
      if (!row) return null;
      Object.assign(row, {
        status: "published",
        statusVersion: row.statusVersion + 1,
        publishedPuzzleId: puzzleId,
        updatedAt,
      });
      return row;
    },
  };
  return { repository, rows };
}

describe("publishing human-reviewed daily puzzles", () => {
  const dateString = "2026-10-28";
  const persist = jest
    .fn()
    .mockResolvedValue({ id: "daily-puzzle-1", alreadyExisted: false });
  let reviewService: jest.Mocked<DailyCandidatePublisherReviewService>;

  beforeEach(() => {
    jest.clearAllMocks();
    reviewService = {
      getCandidateAdmission: jest.fn().mockResolvedValue(admission()),
    };
  });

  it("does not publish an incomplete candidate", async () => {
    const { repository, rows } = memoryRepository([makeCandidate()]);
    reviewService.getCandidateAdmission.mockResolvedValueOnce(
      admission({
        candidateStatus: "open",
        eligible: false,
        qualifiedDecisions: 4,
        reasons: ["candidate is incomplete"],
      }),
    );

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(result).toBeNull();
    expect(persist).not.toHaveBeenCalled();
    expect(rows[0]?.status).toBe("reviewing");
  });

  it("publishes a passing candidate and attaches its qualification evidence", async () => {
    const { repository, rows } = memoryRepository([makeCandidate()]);

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(result).toMatchObject({
      id: "daily-puzzle-1",
      aiGenerated: true,
      date: dateString,
    });
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        dateString,
        answer: payload.answer,
        humanPlaytestAdmission: expect.objectContaining({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          candidateId: "candidate-1",
          qualifiedDecisions: 20,
          solveRateLowerBound: admission().solveEvidence.lower,
        }),
      }),
    );
    expect(rows[0]).toMatchObject({
      status: "published",
      assignedDate: dateString,
    });
  });

  it("resumes the same assigned candidate after a publish retry without rechecking its review", async () => {
    const assigned = makeCandidate("assigned", dateString);
    assigned.humanEvidence = storedEvidence();
    const { repository, rows } = memoryRepository([assigned]);

    await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(reviewService.getCandidateAdmission).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(rows[0]).toMatchObject({
      status: "published",
      assignedDate: dateString,
    });
  });

  it("publishes a previously admitted candidate when the playtest service is temporarily down", async () => {
    const ready = makeCandidate("ready");
    ready.humanEvidence = storedEvidence();
    const pending = makeCandidate();
    const { repository } = memoryRepository([pending, ready]);
    reviewService.getCandidateAdmission.mockRejectedValueOnce(
      new Error("playtest store offline"),
    );

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(result).toMatchObject({ id: "daily-puzzle-1" });
    expect(reviewService.getCandidateAdmission).not.toHaveBeenCalled();
  });

  it("retires candidates that remain in review for more than 60 days", async () => {
    const stale = makeCandidate();
    stale.createdAt = new Date("2026-08-01T00:00:00Z");
    const { repository, rows } = memoryRepository([stale]);

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
      now: () => new Date("2026-10-28T00:00:00Z"),
    });

    expect(result).toBeNull();
    expect(reviewService.getCandidateAdmission).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({
      status: "rejected",
      rejectionReason: expect.stringContaining("60 days"),
    });
  });

  it("skips duplicate-answer candidates and frees the daily assignment", async () => {
    const { repository, rows } = memoryRepository([makeCandidate()]);
    persist.mockRejectedValueOnce(
      new Error("Refusing to persist duplicate answer"),
    );

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(result).toBeNull();
    expect(rows[0]).toMatchObject({
      status: "rejected",
      rejectionReason: expect.stringContaining("duplicate"),
    });
    expect(rows[0]?.assignedDate).toBeUndefined();
  });

  it("fails closed when playtest evidence cannot be loaded", async () => {
    const { repository } = memoryRepository([makeCandidate()]);
    reviewService.getCandidateAdmission.mockRejectedValueOnce(
      new Error("playtest store offline"),
    );

    await expect(
      publishReviewedDailyPuzzle({
        dateString,
        repository,
        reviewService,
        persist,
      }),
    ).rejects.toThrow("playtest store offline");
    expect(persist).not.toHaveBeenCalled();
  });
});
