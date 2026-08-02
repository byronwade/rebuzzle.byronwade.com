import type { PuzzlePlaytestCandidate, PuzzlePlaytestReview } from "@/db/models";
import { buildPuzzleSolveBenchmarkCorpus } from "../../benchmark/puzzle-corpus";
import type { PuzzleBoardRecognitionProfileId } from "../../visual/presentation";
import {
  createPuzzlePlaytestService,
  expectedHumanSolveFloor,
  humanSolveFloorEvidence,
  PUZZLE_PLAYTEST_CONTRACT_VERSION,
  PUZZLE_PLAYTEST_READINESS_VERSION,
  type PuzzlePlaytestRepository,
} from "../puzzle-playtest-service";

const REPRESENTATIVE_TECHNIQUES = [
  "simple_compound",
  "obvious_emoji_sum",
  "single_homophone",
  "basic_positional",
  "multi_emoji_compound",
  "positional_phrase",
  "math_symbol_wordplay",
  "nested_homophone",
  "idiom_as_picture",
  "size_or_case_semantics",
] as const;
const PROFILE_IDS = ["compact-320", "mobile-375", "desktop-768"] as const;

function inMemoryRepository() {
  const store = {
    candidates: [] as PuzzlePlaytestCandidate[],
    reviews: [] as PuzzlePlaytestReview[],
  };
  const repository: PuzzlePlaytestRepository = {
    async insertCandidate(candidate) {
      if (store.candidates.some((row) => row.puzzleId === candidate.puzzleId)) return false;
      store.candidates.push(candidate);
      return true;
    },
    async findCandidateByPuzzleId(input) {
      return (
        store.candidates.find(
          (row) => row.contractVersion === input.contractVersion && row.puzzleId === input.puzzleId
        ) ?? null
      );
    },
    async findCandidateById(id) {
      return store.candidates.find((row) => row.id === id) ?? null;
    },
    async listCandidates(input) {
      return store.candidates
        .filter(
          (row) =>
            row.contractVersion === input.contractVersion &&
            (!input.statuses?.length || input.statuses.includes(row.status)) &&
            (!input.evidenceRoles?.length || input.evidenceRoles.includes(row.evidenceRole))
        )
        .slice(0, input.limit ?? 200);
    },
    async listReviews(input) {
      return store.reviews.filter(
        (row) =>
          row.contractVersion === input.contractVersion &&
          (!input.reviewerId || row.reviewerId === input.reviewerId) &&
          (!input.candidateIds?.length || input.candidateIds.includes(row.candidateId))
      );
    },
    async insertReview(review) {
      if (
        store.reviews.some(
          (row) => row.candidateId === review.candidateId && row.reviewerId === review.reviewerId
        )
      ) {
        return false;
      }
      store.reviews.push(review);
      return true;
    },
    async completeCandidate(input) {
      const row = store.candidates.find(
        (candidate) =>
          candidate.id === input.id &&
          candidate.status === "open" &&
          candidate.statusVersion === input.expectedStatusVersion
      );
      if (!row) return null;
      row.status = "complete";
      row.statusVersion += 1;
      row.updatedAt = input.updatedAt;
      return row;
    },
  };
  return { repository, store };
}

const renderedProfiles: string[] = [];
const renderedVisuals: PuzzlePlaytestCandidate["visual"][] = [];
const renderer = async (
  visual: PuzzlePlaytestCandidate["visual"],
  profileId: PuzzleBoardRecognitionProfileId
) => {
  renderedProfiles.push(profileId);
  renderedVisuals.push(visual);
  return { pixels: new Uint8Array([1, 2, 3]), width: 320, height: 120 };
};

function candidateInput(puzzleId = "puzzle-1") {
  const fixture = buildPuzzleSolveBenchmarkCorpus()[0]!;
  return {
    puzzleId,
    answer: fixture.answer,
    visual: fixture.visual,
    techniqueId: fixture.techniqueId,
    difficultyScore: 5,
  };
}

async function ensureControls(
  service: ReturnType<typeof createPuzzlePlaytestService>
): Promise<void> {
  await service.getReport("control-seed");
}

function seedReviewerControls(
  store: ReturnType<typeof inMemoryRepository>["store"],
  reviewerId: string,
  correctControls = 4
): void {
  const controls = store.candidates
    .filter((candidate) => candidate.evidenceRole === "control")
    .slice(0, 4);
  if (controls.length !== 4) throw new Error("Expected four seeded reviewer controls");
  controls.forEach((candidate, index) => {
    const correct = index < correctControls;
    store.reviews.push({
      id: `control:${reviewerId}:${candidate.id}`,
      contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
      candidateId: candidate.id,
      fixtureId: `control-fixture:${index}`,
      profileId: PROFILE_IDS[index % PROFILE_IDS.length]!,
      reviewerId,
      rawGuess: correct ? candidate.answer : "unrelated answer",
      normalizedGuess: correct ? candidate.answerKey : "unrelatedanswer",
      correct,
      gaveUp: !correct,
      failureReason: correct ? undefined : "too-hard",
      confidence: 4,
      elapsedMs: 8_000,
      createdAt: new Date(index),
    });
  });
}

function seedQualifiedReviewers(
  store: ReturnType<typeof inMemoryRepository>["store"],
  reviewerIds: Iterable<string>
): void {
  for (const reviewerId of reviewerIds) seedReviewerControls(store, reviewerId);
}

function lastRenderedCandidate(
  store: ReturnType<typeof inMemoryRepository>["store"]
): PuzzlePlaytestCandidate {
  const visual = renderedVisuals.at(-1);
  const candidate = store.candidates.find((row) => row.visual === visual);
  if (!candidate) throw new Error("Could not resolve rendered test candidate");
  return candidate;
}

describe("blind human generated-puzzle playtesting", () => {
  beforeEach(() => {
    renderedProfiles.length = 0;
    renderedVisuals.length = 0;
  });

  it("returns only an opaque rendered-board payload", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
    await ensureControls(service);
    seedReviewerControls(store, "reviewer-1");
    const result = await service.getNext("reviewer-1");

    expect(result.specimen).not.toBeNull();
    expect(Object.keys(result.specimen!).sort()).toEqual([
      "fixtureId",
      "height",
      "imageDataUrl",
      "width",
    ]);
    expect(JSON.stringify(result)).not.toContain("sunflower");
    expect(JSON.stringify(result)).not.toContain("puzzle-1");
    expect(result.specimen?.imageDataUrl).toBe("data:image/png;base64,AQID");
  });

  it("balances responsive profiles and never shows two profiles to one reviewer", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    const candidate = await service.submitCandidate(candidateInput());
    await ensureControls(service);
    seedQualifiedReviewers(
      store,
      Array.from({ length: 3 }, (_, index) => `reviewer-${index}`)
    );

    for (let index = 0; index < 3; index++) {
      const reviewerId = `reviewer-${index}`;
      const next = await service.getNext(reviewerId);
      await service.submitReview({
        reviewerId,
        fixtureId: next.specimen!.fixtureId,
        guess: "sunflower",
        confidence: 5,
        elapsedMs: 10_000,
      });
    }

    const generatedReviews = store.reviews.filter((review) => review.candidateId === candidate.id);
    expect(new Set(generatedReviews.map((review) => review.profileId)).size).toBe(3);
    expect(generatedReviews).toHaveLength(3);
    expect((await service.getNext("reviewer-0")).specimen).toBeNull();
  });

  it("does not let failed-control reviews skew responsive profile balancing", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    const candidate = await service.submitCandidate(candidateInput());
    await ensureControls(service);

    const qualifiedProfiles = [
      ...Array.from({ length: 3 }, () => "mobile-375" as const),
      ...Array.from({ length: 3 }, () => "desktop-768" as const),
    ];
    qualifiedProfiles.forEach((profileId, index) => {
      const reviewerId = `qualified-${index}`;
      seedReviewerControls(store, reviewerId);
      store.reviews.push({
        id: `generated:${reviewerId}`,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        candidateId: candidate.id,
        fixtureId: `qualified-fixture:${index}`,
        profileId,
        reviewerId,
        rawGuess: candidate.answer,
        normalizedGuess: candidate.answerKey,
        correct: true,
        gaveUp: false,
        confidence: 5,
        elapsedMs: 8_000,
        createdAt: new Date(100 + index),
      });
    });
    for (let index = 0; index < 10; index++) {
      const reviewerId = `excluded-${index}`;
      seedReviewerControls(store, reviewerId, 1);
      store.reviews.push({
        id: `generated:${reviewerId}`,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        candidateId: candidate.id,
        fixtureId: `excluded-fixture:${index}`,
        profileId: "compact-320",
        reviewerId,
        rawGuess: "unrelated answer",
        normalizedGuess: "unrelatedanswer",
        correct: false,
        gaveUp: false,
        confidence: 5,
        elapsedMs: 8_000,
        createdAt: new Date(200 + index),
      });
    }
    seedReviewerControls(store, "next-qualified");

    expect((await service.getNext("next-qualified")).specimen).not.toBeNull();
    expect(renderedProfiles.at(-1)).toBe("compact-320");
  });

  it("requires a failure reason when a reviewer gives up", async () => {
    const { repository } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
    const next = await service.getNext("reviewer-1");

    await expect(
      service.submitReview({
        reviewerId: "reviewer-1",
        fixtureId: next.specimen!.fixtureId,
        gaveUp: true,
      })
    ).rejects.toThrow("Choose why");
  });

  it("does not count reviews of completed candidates as progress on the remaining open queue", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    const completed = await service.submitCandidate(candidateInput("completed-puzzle"));
    await service.submitCandidate(candidateInput("open-puzzle"));
    await ensureControls(service);
    seedReviewerControls(store, "reviewer-1");
    completed.status = "complete";
    store.reviews.push({
      id: "old-review",
      contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
      candidateId: completed.id,
      fixtureId: "old-fixture",
      profileId: "compact-320",
      reviewerId: "reviewer-1",
      rawGuess: "sunflower",
      normalizedGuess: "sunflower",
      correct: true,
      gaveUp: false,
      confidence: 5,
      elapsedMs: 5_000,
      createdAt: new Date(0),
    });

    const next = await service.getNext("reviewer-1");
    expect(next.specimen).not.toBeNull();
    expect(next.progress).toEqual({ completed: 4, available: 5, remaining: 1, complete: false });
  });

  it("records one immutable decision per reviewer and candidate", async () => {
    const { repository } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
    const next = await service.getNext("reviewer-1");
    const response = {
      reviewerId: "reviewer-1",
      fixtureId: next.specimen!.fixtureId,
      guess: "sunflower",
      confidence: 4,
      elapsedMs: 8_000,
    };

    await service.submitReview(response);
    await expect(service.submitReview(response)).rejects.toThrow(
      "already been playtested by this reviewer"
    );
  });

  it("interleaves hidden controls and scores generated decisions only after qualification", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    for (let index = 0; index < 3; index++) {
      await service.submitCandidate(candidateInput(`generated-${index}`));
    }

    const roles: PuzzlePlaytestCandidate["evidenceRole"][] = [];
    for (let index = 0; index < 7; index++) {
      const next = await service.getNext("qualifying-reviewer");
      expect(next.specimen).not.toBeNull();
      const candidate = lastRenderedCandidate(store);
      roles.push(candidate.evidenceRole);
      await service.submitReview({
        reviewerId: "qualifying-reviewer",
        fixtureId: next.specimen!.fixtureId,
        guess: candidate.answer,
        confidence: 5,
        elapsedMs: 8_000,
      });
    }

    expect(roles).toEqual([
      "control",
      "generated",
      "control",
      "generated",
      "control",
      "generated",
      "control",
    ]);
    const report = await service.getReport("qualifying-reviewer");
    expect(report.controlCandidateCount).toBe(6);
    expect(report.candidateCount).toBe(3);
    expect(report.decisionCount).toBe(3);
    expect(report.reviewerQuality).toMatchObject({
      qualifiedReviewers: 1,
      excludedReviewers: 0,
      controlDecisions: 4,
      qualifiedGeneratedDecisions: 3,
      unscoredGeneratedDecisions: 0,
    });
    expect(report.visibleCandidates).toHaveLength(3);
  });

  it("excludes failed-control reviewers and all of their generated judgments", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    for (let index = 0; index < 3; index++) {
      await service.submitCandidate(candidateInput(`held-out-${index}`));
    }

    let seenControls = 0;
    for (let index = 0; index < 7; index++) {
      const next = await service.getNext("failed-reviewer");
      const candidate = lastRenderedCandidate(store);
      const controlIsCorrect = candidate.evidenceRole === "control" && seenControls === 0;
      if (candidate.evidenceRole === "control") seenControls += 1;
      await service.submitReview({
        reviewerId: "failed-reviewer",
        fixtureId: next.specimen!.fixtureId,
        guess:
          candidate.evidenceRole === "generated" || controlIsCorrect
            ? candidate.answer
            : "unrelated answer",
        confidence: 5,
        elapsedMs: 8_000,
      });
    }

    expect((await service.getNext("failed-reviewer")).specimen).toBeNull();
    expect(
      store.candidates
        .filter((candidate) => candidate.evidenceRole === "generated")
        .every((candidate) => candidate.status === "open")
    ).toBe(true);
    const report = await service.getReport("failed-reviewer");
    expect(report.reviewerCount).toBe(0);
    expect(report.completedDecisionCount).toBe(0);
    expect(report.reviewerQuality).toMatchObject({
      qualifiedReviewers: 0,
      excludedReviewers: 1,
      controlDecisions: 4,
      qualifiedGeneratedDecisions: 0,
      unscoredGeneratedDecisions: 3,
    });
    expect(report.releaseFailures.join(" ")).toContain("Failed-control reviewer rate");
  });

  it("completes a candidate only after five reviewers cover every profile", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
    await ensureControls(service);
    seedQualifiedReviewers(
      store,
      Array.from({ length: 15 }, (_, index) => `reviewer-${index}`)
    );

    for (let index = 0; index < 14; index++) {
      const reviewerId = `reviewer-${index}`;
      const next = await service.getNext(reviewerId);
      await service.submitReview({
        reviewerId,
        fixtureId: next.specimen!.fixtureId,
        guess: "sunflower",
        confidence: 5,
        elapsedMs: 12_000,
      });
    }
    expect(store.candidates[0]?.status).toBe("open");

    const fifteenth = await service.getNext("reviewer-14");
    await service.submitReview({
      reviewerId: "reviewer-14",
      fixtureId: fifteenth.specimen!.fixtureId,
      guess: "sunflower",
      confidence: 5,
      elapsedMs: 12_000,
    });
    expect(store.candidates[0]?.status).toBe("complete");
    expect(
      Object.fromEntries(
        PROFILE_IDS.map((profileId) => [
          profileId,
          store.reviews.filter(
            (review) =>
              review.candidateId ===
                store.candidates.find((row) => row.evidenceRole === "generated")?.id &&
              review.profileId === profileId
          ).length,
        ])
      )
    ).toEqual({ "compact-320": 5, "mobile-375": 5, "desktop-768": 5 });
  });

  it("does not reveal a candidate answer until that reviewer has judged it", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
    await ensureControls(service);
    seedReviewerControls(store, "reviewer-1");
    expect((await service.getReport("reviewer-1")).visibleCandidates).toEqual([]);

    const next = await service.getNext("reviewer-1");
    await service.submitReview({
      reviewerId: "reviewer-1",
      fixtureId: next.specimen!.fixtureId,
      guess: "sun flower",
      confidence: 4,
      elapsedMs: 9_000,
    });
    const report = await service.getReport("reviewer-1");
    expect(report.visibleCandidates[0]?.answer).toBe("sunflower");
    expect(report.visibleCandidates[0]?.decisions).toBe(1);
    expect((await service.getReport("reviewer-2")).visibleCandidates).toEqual([]);
  });

  it("refuses to call sparse perfect evidence release-ready", async () => {
    const { repository } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
    const report = await service.getReport("reviewer-1");

    expect(report.releaseReady).toBe(false);
    expect(report.marketLeadingReady).toBe(false);
    expect(report.releaseFailures.join(" ")).toContain("0/30");
    expect(report.marketLeadingFailures.join(" ")).toContain("0/100");
  });

  it("uses explicit difficulty-adjusted solve floors", () => {
    expect([4, 5, 6, 7, 8, 10].map(expectedHumanSolveFloor)).toEqual([
      0.65, 0.65, 0.5, 0.35, 0.2, 0.2,
    ]);
  });

  it("requires the one-sided 95% solve bound to clear each candidate floor", () => {
    const rawPassOnly = humanSolveFloorEvidence(10, 15, 5);
    expect(rawPassOnly.rate).toBeGreaterThan(0.65);
    expect(rawPassOnly.lower).toBeLessThan(0.65);
    expect(rawPassOnly.passes).toBe(false);

    const supportedPass = humanSolveFloorEvidence(13, 15, 5);
    expect(supportedPass.lower).toBeGreaterThan(0.65);
    expect(supportedPass.passes).toBe(true);
  });

  it("computes market-leading status only from 100 fully covered generated puzzles", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await ensureControls(service);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `candidate-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRole: "generated",
        puzzleId: `puzzle-${candidateIndex}`,
        answer: "sunflower",
        answerKey: "sunflower",
        visual,
        techniqueId: REPRESENTATIVE_TECHNIQUES[candidateIndex % REPRESENTATIVE_TECHNIQUES.length],
        difficultyScore: [5, 6, 7, 8][candidateIndex % 4]!,
        automatedEstimatedSolveRate: 1,
        status: "complete",
        statusVersion: 1,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
      for (const [profileIndex, profileId] of PROFILE_IDS.entries()) {
        for (let reviewerIndex = 0; reviewerIndex < 5; reviewerIndex++) {
          const reviewerId = `reviewer-${(candidateIndex * 15 + profileIndex * 5 + reviewerIndex) % 50}`;
          store.reviews.push({
            id: `${candidateId}:${profileId}:${reviewerIndex}`,
            contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
            candidateId,
            fixtureId: "opaque",
            profileId,
            reviewerId,
            rawGuess: "sunflower",
            normalizedGuess: "sunflower",
            correct: true,
            gaveUp: false,
            confidence: 5,
            elapsedMs: 10_000,
            createdAt: new Date(0),
          });
        }
      }
    }
    seedQualifiedReviewers(
      store,
      Array.from({ length: 50 }, (_, index) => `reviewer-${index}`)
    );

    const report = await service.getReport("outside-reviewer");
    expect(report.completedDecisionCount).toBe(1500);
    expect(report.readinessVersion).toBe(PUZZLE_PLAYTEST_READINESS_VERSION);
    expect(report.reviewerCount).toBe(50);
    expect(report.reviewerCoverage.maximumDecisionShare).toBe(0.02);
    expect(report.difficultyTierScores.map((score) => score.candidates)).toEqual([25, 25, 25, 25]);
    expect(report.techniqueScores).toHaveLength(10);
    expect(report.candidateFloorPassRate).toBe(1);
    expect(report.statisticalEvidence).toMatchObject({
      method: "one-sided-wilson-score",
      confidenceLevel: 0.95,
    });
    expect(report.statisticalEvidence.candidateFloorPass.lower).toBeGreaterThan(0.97);
    expect(report.statisticalEvidence.visualFailure.upper).toBeLessThan(0.02);
    expect(report.clusteredEvidence).toMatchObject({
      method: "pigeonhole-bootstrap",
      confidenceLevel: 0.95,
      replicates: 1000,
      rowClusters: 50,
      columnClusters: 100,
      sufficient: true,
    });
    expect(report.conservativeEvidence).toMatchObject({
      method: "wilson-envelope-with-pigeonhole-bootstrap",
      confidenceLevel: 0.95,
      responsiveSolveGapUpperBound: 0,
      solveCalibrationMeanAbsoluteErrorUpperBound: 0,
      solveCalibrationAbsoluteBiasUpperBound: 0,
    });
    expect(report.conservativeEvidence.visualFailureUpperBound).toBe(
      report.statisticalEvidence.visualFailure.upper
    );
    expect(report.conservativeEvidence.candidateFloorPassLowerBound).toBe(
      report.statisticalEvidence.candidateFloorPass.lower
    );
    expect(report.releaseReady).toBe(true);
    expect(report.marketLeadingReady).toBe(true);

    for (let index = 0; index < 6; index++) {
      seedReviewerControls(store, `failed-market-reviewer-${index}`, 1);
    }
    const controlContaminated = await service.getReport("outside-reviewer");
    expect(controlContaminated.releaseReady).toBe(true);
    expect(controlContaminated.marketLeadingReady).toBe(false);
    expect(controlContaminated.marketLeadingFailures.join(" ")).toContain(
      "Failed-control reviewer rate"
    );
  });

  it("rejects a large but homogeneous human sample", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await ensureControls(service);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `homogeneous-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRole: "generated",
        puzzleId: `homogeneous-puzzle-${candidateIndex}`,
        answer: "sunflower",
        answerKey: "sunflower",
        visual,
        techniqueId: "simple_compound",
        difficultyScore: 5,
        automatedEstimatedSolveRate: 1,
        status: "complete",
        statusVersion: 1,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
      for (const [profileIndex, profileId] of PROFILE_IDS.entries()) {
        for (let reviewerIndex = 0; reviewerIndex < 5; reviewerIndex++) {
          store.reviews.push({
            id: `${candidateId}:${profileId}:${reviewerIndex}`,
            contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
            candidateId,
            fixtureId: "opaque",
            profileId,
            reviewerId: `reviewer-${(candidateIndex * 15 + profileIndex * 5 + reviewerIndex) % 50}`,
            rawGuess: "sunflower",
            normalizedGuess: "sunflower",
            correct: true,
            gaveUp: false,
            confidence: 5,
            elapsedMs: 10_000,
            createdAt: new Date(0),
          });
        }
      }
    }
    seedQualifiedReviewers(
      store,
      Array.from({ length: 50 }, (_, index) => `reviewer-${index}`)
    );

    const report = await service.getReport("outside-reviewer");
    expect(report.marketLeadingReady).toBe(false);
    expect(report.marketLeadingFailures.join(" ")).toContain("Difficulty-tier coverage incomplete");
    expect(report.marketLeadingFailures.join(" ")).toContain("Technique breadth 1/10");
    expect(report.marketLeadingFailures.join(" ")).toContain("Technique concentration");
  });

  it("rejects concentrated reviewers even when puzzle strata are representative", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await ensureControls(service);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `concentrated-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRole: "generated",
        puzzleId: `concentrated-puzzle-${candidateIndex}`,
        answer: "sunflower",
        answerKey: "sunflower",
        visual,
        techniqueId: REPRESENTATIVE_TECHNIQUES[candidateIndex % REPRESENTATIVE_TECHNIQUES.length],
        difficultyScore: [5, 6, 7, 8][candidateIndex % 4]!,
        automatedEstimatedSolveRate: 1,
        status: "complete",
        statusVersion: 1,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
      for (const [profileIndex, profileId] of PROFILE_IDS.entries()) {
        for (let reviewerIndex = 0; reviewerIndex < 5; reviewerIndex++) {
          const reviewerId = `reviewer-${profileIndex * 5 + reviewerIndex}`;
          store.reviews.push({
            id: `${candidateId}:${profileId}:${reviewerIndex}`,
            contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
            candidateId,
            fixtureId: "opaque",
            profileId,
            reviewerId,
            rawGuess: "sunflower",
            normalizedGuess: "sunflower",
            correct: true,
            gaveUp: false,
            confidence: 5,
            elapsedMs: 10_000,
            createdAt: new Date(0),
          });
        }
      }
    }
    seedQualifiedReviewers(
      store,
      Array.from({ length: 15 }, (_, index) => `reviewer-${index}`)
    );

    const report = await service.getReport("outside-reviewer");
    expect(report.reviewerCount).toBe(15);
    expect(report.reviewerCoverage.maximumDecisionShare).toBeCloseTo(1 / 15);
    expect(report.marketLeadingReady).toBe(false);
    expect(report.marketLeadingFailures.join(" ")).toContain("Independent reviewer breadth 15/50");
    expect(report.marketLeadingFailures.join(" ")).toContain("One-reviewer decision share");
  });

  it("rejects unclassified techniques from an otherwise representative sample", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await ensureControls(service);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `classified-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRole: "generated",
        puzzleId: `classified-puzzle-${candidateIndex}`,
        answer: "sunflower",
        answerKey: "sunflower",
        visual,
        techniqueId:
          candidateIndex === 0
            ? "invented-technique"
            : REPRESENTATIVE_TECHNIQUES[candidateIndex % REPRESENTATIVE_TECHNIQUES.length],
        difficultyScore: [5, 6, 7, 8][candidateIndex % 4]!,
        automatedEstimatedSolveRate: 1,
        status: "complete",
        statusVersion: 1,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
      for (const [profileIndex, profileId] of PROFILE_IDS.entries()) {
        for (let reviewerIndex = 0; reviewerIndex < 5; reviewerIndex++) {
          store.reviews.push({
            id: `${candidateId}:${profileId}:${reviewerIndex}`,
            contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
            candidateId,
            fixtureId: "opaque",
            profileId,
            reviewerId: `reviewer-${(candidateIndex * 15 + profileIndex * 5 + reviewerIndex) % 50}`,
            rawGuess: "sunflower",
            normalizedGuess: "sunflower",
            correct: true,
            gaveUp: false,
            confidence: 5,
            elapsedMs: 10_000,
            createdAt: new Date(0),
          });
        }
      }
    }
    seedQualifiedReviewers(
      store,
      Array.from({ length: 50 }, (_, index) => `reviewer-${index}`)
    );

    const report = await service.getReport("outside-reviewer");
    expect(report.marketLeadingReady).toBe(false);
    expect(report.marketLeadingFailures.join(" ")).toContain("Named-technique coverage 99/100");
  });
});
