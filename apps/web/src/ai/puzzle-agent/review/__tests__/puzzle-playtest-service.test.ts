import type { PuzzlePlaytestCandidate, PuzzlePlaytestReview } from "@/db/models";
import { buildPuzzleSolveBenchmarkCorpus } from "../../benchmark/puzzle-corpus";
import type { PuzzleBoardRecognitionProfileId } from "../../visual/presentation";
import {
  createPuzzlePlaytestService,
  expectedHumanSolveFloor,
  PUZZLE_PLAYTEST_CONTRACT_VERSION,
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
            (!input.statuses?.length || input.statuses.includes(row.status))
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
const renderer = async (
  _visual: PuzzlePlaytestCandidate["visual"],
  profileId: PuzzleBoardRecognitionProfileId
) => {
  renderedProfiles.push(profileId);
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

describe("blind human generated-puzzle playtesting", () => {
  beforeEach(() => {
    renderedProfiles.length = 0;
  });

  it("returns only an opaque rendered-board payload", async () => {
    const { repository } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
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

    expect(new Set(store.reviews.map((review) => review.profileId)).size).toBe(3);
    expect(store.reviews.every((review) => review.candidateId === candidate.id)).toBe(true);
    expect((await service.getNext("reviewer-0")).specimen).toBeNull();
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
    expect(next.progress).toEqual({ completed: 0, available: 1, remaining: 1, complete: false });
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

  it("completes a candidate only after five reviewers cover every profile", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());

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
          store.reviews.filter((review) => review.profileId === profileId).length,
        ])
      )
    ).toEqual({ "compact-320": 5, "mobile-375": 5, "desktop-768": 5 });
  });

  it("does not reveal a candidate answer until that reviewer has judged it", async () => {
    const { repository } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    await service.submitCandidate(candidateInput());
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

  it("computes market-leading status only from 100 fully covered generated puzzles", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `candidate-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
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

    const report = await service.getReport("outside-reviewer");
    expect(report.completedDecisionCount).toBe(1500);
    expect(report.reviewerCount).toBe(50);
    expect(report.reviewerCoverage.maximumDecisionShare).toBe(0.02);
    expect(report.difficultyTierScores.map((score) => score.candidates)).toEqual([25, 25, 25, 25]);
    expect(report.techniqueScores).toHaveLength(10);
    expect(report.candidateFloorPassRate).toBe(1);
    expect(report.releaseReady).toBe(true);
    expect(report.marketLeadingReady).toBe(true);
  });

  it("rejects a large but homogeneous human sample", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `homogeneous-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
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

    const report = await service.getReport("outside-reviewer");
    expect(report.marketLeadingReady).toBe(false);
    expect(report.marketLeadingFailures.join(" ")).toContain("Difficulty-tier coverage incomplete");
    expect(report.marketLeadingFailures.join(" ")).toContain("Technique breadth 1/10");
    expect(report.marketLeadingFailures.join(" ")).toContain("Technique concentration");
  });

  it("rejects concentrated reviewers even when puzzle strata are representative", async () => {
    const { repository, store } = inMemoryRepository();
    const service = createPuzzlePlaytestService(repository, renderer);
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `concentrated-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
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
    const visual = buildPuzzleSolveBenchmarkCorpus()[0]!.visual;
    for (let candidateIndex = 0; candidateIndex < 100; candidateIndex++) {
      const candidateId = `classified-${candidateIndex}`;
      store.candidates.push({
        id: candidateId,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
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

    const report = await service.getReport("outside-reviewer");
    expect(report.marketLeadingReady).toBe(false);
    expect(report.marketLeadingFailures.join(" ")).toContain("Named-technique coverage 99/100");
  });
});
