import {
  humanSolveFloorEvidence,
  PUZZLE_PLAYTEST_CONTRACT_VERSION,
  type PuzzlePlaytestCandidateAdmission,
} from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import type { PublicationAssetCheck } from "@/ai/puzzle-agent/visual/publication-assets";
import type { DailyPuzzleCandidate, DailyPuzzleCandidateHumanEvidence } from "@/db/models";
import type { DailyPuzzleCandidateRepository } from "../daily-puzzle-candidate-repository";
import { computeOwnerContentHash } from "../owner-approval";
import {
  type DailyCandidatePublisherReviewService,
  publishReviewedDailyPuzzle,
} from "../publish-reviewed-daily-puzzle";

const PROFILE_IDS = ["compact-320", "mobile-375", "mobile-375-medium", "desktop-768"] as const;
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
  assignedDate?: string
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
  overrides: Partial<PuzzlePlaytestCandidateAdmission> = {}
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
          (!input.withoutPlaytestSubmission || !row.playtestSubmittedAt)
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
          candidate.statusVersion === expectedStatusVersion
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
      const row = rows.find((candidate) => candidate.id === id && candidate.status === "ready");
      if (!row) return null;
      Object.assign(row, {
        status: "assigned",
        statusVersion: row.statusVersion + 1,
        assignedDate: dateString,
      });
      return row;
    },
    async releaseAssignment({ id, dateString, updatedAt }) {
      const row = rows.find(
        (candidate) =>
          candidate.id === id &&
          candidate.status === "assigned" &&
          candidate.assignedDate === dateString
      );
      if (!row) return null;
      Object.assign(row, {
        status: "ready",
        statusVersion: row.statusVersion + 1,
        assignedDate: undefined,
        updatedAt,
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
          candidate.assignedDate === dateString
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
    async approve() {
      return null;
    },
    async claimOldestBackupForDate() {
      return null;
    },
  };
  return { repository, rows };
}

describe("publishing human-reviewed daily puzzles", () => {
  const dateString = "2026-10-28";
  const persist = jest.fn().mockResolvedValue({ id: "daily-puzzle-1", alreadyExisted: false });
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
      })
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
      })
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
    reviewService.getCandidateAdmission.mockRejectedValueOnce(new Error("playtest store offline"));

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(result).toMatchObject({ id: "daily-puzzle-1" });
    expect(reviewService.getCandidateAdmission).not.toHaveBeenCalled();
  });

  it("leaves owner-approved candidates for the approval gate before the cutover", async () => {
    const approved = makeCandidate("ready");
    approved.humanEvidence = storedEvidence();
    approved.ownerApproval = {
      approvedBy: "owner",
      approvedAt: new Date("2026-10-27T00:00:00Z"),
      role: "backup",
      contentHash: computeOwnerContentHash(payload),
    };
    const { repository, rows } = memoryRepository([approved]);

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    expect(result).toBeNull();
    expect(persist).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({ status: "ready" });
    expect(rows[0]?.assignedDate).toBeUndefined();
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
    persist.mockRejectedValueOnce(new Error("Refusing to persist duplicate answer"));

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

  it("keeps the candidate for later and serves nothing when another puzzle already owns the date", async () => {
    const ready = makeCandidate("ready");
    ready.humanEvidence = storedEvidence();
    const second = { ...makeCandidate("ready"), id: "candidate-2" } as DailyPuzzleCandidate;
    second.humanEvidence = storedEvidence();
    const { repository, rows } = memoryRepository([ready, second]);
    persist.mockResolvedValueOnce({ id: "reserve-puzzle", alreadyExisted: true });

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
    });

    // Pairing the reserve's id with this candidate's board would reject every correct guess.
    expect(result).toBeNull();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(rows[0]).toMatchObject({ status: "ready" });
    expect(rows[0]?.assignedDate).toBeUndefined();
    expect(rows[0]?.publishedPuzzleId).toBeUndefined();
    expect(rows[1]).toMatchObject({ status: "ready" });
  });

  it("does not publish a candidate whose artwork lost approval while it waited", async () => {
    const quarantined = makeCandidate("ready");
    quarantined.humanEvidence = storedEvidence();
    const approved = { ...makeCandidate("ready"), id: "candidate-2" } as DailyPuzzleCandidate;
    approved.humanEvidence = storedEvidence();
    const { repository, rows } = memoryRepository([quarantined, approved]);
    const verifyAssets = jest
      .fn<Promise<PublicationAssetCheck>, [unknown]>()
      .mockResolvedValueOnce({
        ok: false,
        reason: 'Pictogram "clock" does not match its approved registry asset',
      })
      .mockResolvedValue({ ok: true });

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
      verifyAssets,
    });

    expect(result).toMatchObject({ id: "daily-puzzle-1" });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        humanPlaytestAdmission: expect.objectContaining({ candidateId: "candidate-2" }),
      })
    );
    expect(rows[0]).toMatchObject({ status: "ready" });
    expect(rows[0]?.assignedDate).toBeUndefined();
    expect(rows[1]).toMatchObject({ status: "published", assignedDate: dateString });
  });

  it("fails closed when playtest evidence cannot be loaded", async () => {
    const { repository } = memoryRepository([makeCandidate()]);
    reviewService.getCandidateAdmission.mockRejectedValueOnce(new Error("playtest store offline"));

    await expect(
      publishReviewedDailyPuzzle({
        dateString,
        repository,
        reviewService,
        persist,
      })
    ).rejects.toThrow("playtest store offline");
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("owner approval required", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  beforeEach(() => {
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-11-01";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  const validApproval = (role: "scheduled" | "backup") => ({
    approvedBy: "owner",
    approvedAt: new Date("2026-11-02T00:00:00Z"),
    role,
    contentHash: computeOwnerContentHash(payload),
  });

  function mockRepository(
    overrides: Partial<DailyPuzzleCandidateRepository>
  ): jest.Mocked<DailyPuzzleCandidateRepository> {
    return {
      insert: jest.fn(),
      findById: jest.fn(),
      findByGenerationKey: jest.fn(),
      findAssignmentForDate: jest.fn().mockResolvedValue(null),
      list: jest.fn().mockResolvedValue([]),
      markPlaytestSubmitted: jest.fn(),
      markPlaytestSubmissionFailed: jest.fn(),
      markReady: jest.fn(),
      claimReadyForDate: jest.fn(),
      releaseAssignment: jest.fn(),
      skip: jest.fn(),
      markPublished: jest.fn(),
      approve: jest.fn(),
      claimOldestBackupForDate: jest.fn().mockResolvedValue(null),
      ...overrides,
    } as jest.Mocked<DailyPuzzleCandidateRepository>;
  }
  const reviewService: DailyCandidatePublisherReviewService = {
    getCandidateAdmission: jest.fn().mockResolvedValue(admission()),
  };
  const okAssets = jest.fn().mockResolvedValue({ ok: true } as PublicationAssetCheck);

  it("publishes the scheduled candidate with its approval passed to persist", async () => {
    const scheduled: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("scheduled"),
    };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-1", alreadyExisted: false });
    const repository = mockRepository({
      findAssignmentForDate: jest.fn().mockResolvedValue(scheduled),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(result).toMatchObject({ id: "puzzle-1", servedFromBackup: false });
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerApproval: scheduled.ownerApproval,
        dateString: "2026-11-20",
      })
    );
  });

  it("rejects a scheduled candidate whose approval no longer matches and falls back to a backup", async () => {
    const stale: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: storedEvidence(),
      ownerApproval: { ...validApproval("scheduled"), contentHash: "stale" },
    };
    const backup: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      id: "backup-1",
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("backup"),
    };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-2", alreadyExisted: false });
    const repository = mockRepository({
      findAssignmentForDate: jest.fn().mockResolvedValue(stale),
      claimOldestBackupForDate: jest.fn().mockResolvedValueOnce(backup),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(repository.skip).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "candidate-1",
        reason: expect.stringContaining("approval"),
      })
    );
    expect(result).toMatchObject({ id: "puzzle-2", servedFromBackup: true });
  });

  it("never auto-claims a ready candidate the owner has not approved", async () => {
    const persist = jest.fn();
    const repository = mockRepository({
      list: jest
        .fn()
        .mockImplementation(async ({ statuses }) =>
          statuses?.includes("ready")
            ? [{ ...makeCandidate("ready"), humanEvidence: storedEvidence() }]
            : []
        ),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(result).toBeNull();
    expect(repository.claimReadyForDate).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("still serves the approved scheduled puzzle when the playtest service is down", async () => {
    const scheduled: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("scheduled"),
    };
    const pending = { ...makeCandidate(), id: "candidate-pending" } as DailyPuzzleCandidate;
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-3", alreadyExisted: false });
    const repository = mockRepository({
      findAssignmentForDate: jest.fn().mockResolvedValue(scheduled),
      list: jest
        .fn()
        .mockImplementation(async ({ statuses }) =>
          statuses?.includes("reviewing") ? [pending] : []
        ),
    });
    const offline: DailyCandidatePublisherReviewService = {
      getCandidateAdmission: jest.fn().mockRejectedValue(new Error("playtest store offline")),
    };

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService: offline,
      persist,
      verifyAssets: okAssets,
    });

    expect(offline.getCandidateAdmission).toHaveBeenCalled();
    expect(result).toMatchObject({ id: "puzzle-3", servedFromBackup: false });
  });

  it("rejects a backup whose artwork fails the asset recheck and serves the next backup", async () => {
    const broken: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      id: "backup-1",
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("backup"),
    };
    const next: DailyPuzzleCandidate = { ...broken, id: "backup-2" };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-4", alreadyExisted: false });
    const repository = mockRepository({
      claimOldestBackupForDate: jest
        .fn()
        .mockResolvedValueOnce(broken)
        .mockResolvedValueOnce(next)
        .mockResolvedValue(null),
    });
    const verifyAssets = jest
      .fn<Promise<PublicationAssetCheck>, [unknown]>()
      .mockResolvedValueOnce({ ok: false, reason: "quarantined" })
      .mockResolvedValue({ ok: true });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets,
    });

    expect(repository.skip).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "backup-1",
        reason: "Approved puzzle artwork failed the publication asset recheck",
      })
    );
    expect(repository.releaseAssignment).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: "puzzle-4", servedFromBackup: true });
  });

  it("rejects a backup whose approval no longer matches and serves the next backup", async () => {
    const stale: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      id: "backup-stale",
      humanEvidence: storedEvidence(),
      ownerApproval: { ...validApproval("backup"), contentHash: "stale" },
    };
    const next: DailyPuzzleCandidate = {
      ...stale,
      id: "backup-2",
      ownerApproval: validApproval("backup"),
    };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-6", alreadyExisted: false });
    const repository = mockRepository({
      claimOldestBackupForDate: jest
        .fn()
        .mockResolvedValueOnce(stale)
        .mockResolvedValueOnce(next)
        .mockResolvedValue(null),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(repository.skip).toHaveBeenCalledWith(
      expect.objectContaining({ id: "backup-stale", reason: expect.stringContaining("approval") })
    );
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ ownerApproval: next.ownerApproval })
    );
    expect(result).toMatchObject({ id: "puzzle-6", servedFromBackup: true });
  });

  it("marks the scheduled candidate published when a concurrent request loses the race", async () => {
    const scheduled: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("scheduled"),
    };
    const { repository, rows } = memoryRepository([scheduled]);
    let finishWinner: (value: { id: string; alreadyExisted: boolean }) => void = () => {};
    const persist = jest
      .fn()
      // Winner inserts the row but is slow to return.
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishWinner = resolve;
          })
      )
      // Loser sees the winner's row for this date.
      .mockResolvedValueOnce({ id: "puzzle-race", alreadyExisted: true });
    const publish = () =>
      publishReviewedDailyPuzzle({
        dateString: "2026-11-20",
        repository,
        reviewService,
        persist,
        verifyAssets: okAssets,
      });

    const winner = publish();
    const loser = await publish();
    finishWinner({ id: "puzzle-race", alreadyExisted: false });
    const won = await winner;

    expect(loser).toBeNull();
    expect(won).toMatchObject({ id: "puzzle-race", servedFromBackup: false });
    // Releasing would strand an approved scheduled candidate as "ready" with no date.
    expect(rows[0]).toMatchObject({
      status: "published",
      assignedDate: "2026-11-20",
      publishedPuzzleId: "puzzle-race",
    });
  });

  it("rejects a scheduled candidate whose artwork fails the asset recheck and serves a backup", async () => {
    const scheduled: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("scheduled"),
    };
    const backup: DailyPuzzleCandidate = {
      ...scheduled,
      id: "backup-1",
      ownerApproval: validApproval("backup"),
    };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-5", alreadyExisted: false });
    const repository = mockRepository({
      findAssignmentForDate: jest.fn().mockResolvedValue(scheduled),
      claimOldestBackupForDate: jest.fn().mockResolvedValueOnce(backup).mockResolvedValue(null),
    });
    const verifyAssets = jest
      .fn<Promise<PublicationAssetCheck>, [unknown]>()
      .mockResolvedValueOnce({ ok: false, reason: "quarantined" })
      .mockResolvedValue({ ok: true });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets,
    });

    expect(repository.skip).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "candidate-1",
        reason: "Approved puzzle artwork failed the publication asset recheck",
      })
    );
    expect(repository.releaseAssignment).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ ownerApproval: backup.ownerApproval })
    );
    expect(result).toMatchObject({ id: "puzzle-5", servedFromBackup: true });
  });

  it("rejects a scheduled candidate that fails to publish and serves a backup", async () => {
    const scheduled: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("scheduled"),
    };
    const backup: DailyPuzzleCandidate = {
      ...scheduled,
      id: "backup-1",
      ownerApproval: validApproval("backup"),
    };
    const persist = jest
      .fn()
      .mockRejectedValueOnce(new Error("Daily challenge check failed"))
      .mockResolvedValue({ id: "puzzle-6", alreadyExisted: false });
    const repository = mockRepository({
      findAssignmentForDate: jest.fn().mockResolvedValue(scheduled),
      claimOldestBackupForDate: jest.fn().mockResolvedValueOnce(backup).mockResolvedValue(null),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(repository.skip).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "candidate-1",
        reason: expect.stringContaining("Daily challenge check failed"),
      })
    );
    expect(result).toMatchObject({ id: "puzzle-6", servedFromBackup: true });
  });

  it("returns a backup that fails to publish to the pool instead of burning the rest", async () => {
    const backup: DailyPuzzleCandidate = {
      ...makeCandidate("assigned", "2026-11-20"),
      id: "backup-1",
      humanEvidence: storedEvidence(),
      ownerApproval: validApproval("backup"),
    };
    const persist = jest.fn().mockRejectedValue(new Error("mongo unavailable"));
    const repository = mockRepository({
      claimOldestBackupForDate: jest.fn().mockResolvedValue(backup),
    });

    await expect(
      publishReviewedDailyPuzzle({
        dateString: "2026-11-20",
        repository,
        reviewService,
        persist,
        verifyAssets: okAssets,
      })
    ).rejects.toThrow("mongo unavailable");

    expect(repository.releaseAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "backup-1", dateString: "2026-11-20" })
    );
    expect(repository.skip).not.toHaveBeenCalled();
    expect(repository.claimOldestBackupForDate).toHaveBeenCalledTimes(1);
  });
});
