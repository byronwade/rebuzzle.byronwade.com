import type { Puzzle } from "@/db/models";
import {
  createPuzzlePlaytestBackfillService,
  inspectPuzzleForPlaytestBackfill,
  type PuzzlePlaytestBackfillSource,
} from "../puzzle-playtest-backfill";

function eligiblePuzzle(id = "puzzle-1"): Puzzle {
  const boardProfiles = [
    ["compact-320", 320, 44],
    ["mobile-375", 375, 72],
    ["desktop-768", 768, 72],
  ].map(([profileId, viewportWidth, tileSize]) => ({
    profileId: String(profileId),
    viewportWidth: Number(viewportWidth),
    tileSize: Number(tileSize),
    confidence: 0.9,
    models: ["vision-a", "vision-b"],
    conceptVotes: {},
    textVotes: { SUN: 2, FLOWER: 2 },
    operatorVotes: { "+": 2 },
    wrappedRows: 1,
  }));
  const profiles = ["compact-320", "mobile-375", "desktop-768"].map((profileId) => ({
    profileId,
    judgeCount: 2,
    targetFoundBy: 2,
    topTargetFoundBy: 2,
    dominantTargetFoundBy: 2,
    meanReciprocalRank: 1,
    strongestWrongConfidence: 0.1,
  }));
  return {
    id,
    puzzle: "SUN + FLOWER",
    puzzleType: "rebus",
    answer: "sunflower",
    difficulty: "hard",
    category: "compound_words",
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    active: true,
    visual: {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "SUN + FLOWER",
      layers: [
        { kind: "text", content: "SUN", emphasis: "normal" },
        { kind: "operator", symbol: "+" },
        { kind: "text", content: "FLOWER", emphasis: "normal" },
      ],
    },
    metadata: {
      aiGenerated: true,
      techniqueId: "simple_compound",
      difficultyScore: 5,
      difficultyLevel: "Hard",
      generationMethod: "apex-tournament",
      estimatedSolveRate: 0.8,
      boardRecognitionConfidence: 0.9,
      boardRecognitionModels: ["vision-a", "vision-b"],
      boardRecognitionProfiles: boardProfiles,
      noveltyEvidence: {
        version: "structural-v1",
        fingerprint: "f".repeat(64),
        answerKey: "sunflower",
        mechanismFamilyKey: "a".repeat(64),
        mechanismKey: "b".repeat(64),
        topologyKey: "c".repeat(64),
        cueCombinationKey: "d".repeat(64),
        orderedCueKey: "e".repeat(64),
        cueTokens: ["sun", "flower"],
        score: 100,
        closestStructuralSimilarity: 0,
        recentMechanismFamilyUses: 0,
        recentTopologyUses: 0,
        lookbackDays: 90,
      },
      playabilityEvidence: {
        blind: {
          profileCount: 3,
          profilesWithTarget: 3,
          profilesWithTopTarget: 3,
          profilesWithDominantTarget: 3,
          topTargetFoundBy: 6,
          dominantTargetFoundBy: 6,
          meanReciprocalRank: 1,
          strongestWrongConfidence: 0.1,
          requiredVotes: 2,
          profiles,
        },
        editorial: {
          profileCount: 3,
          acceptedProfiles: 3,
          confidence: 0.95,
          failureKinds: [],
        },
      },
    },
  };
}

function source(rows: Puzzle[], queuedIds: string[] = []): PuzzlePlaytestBackfillSource {
  return {
    async listRecentPuzzles(scanLimit) {
      return rows.slice(0, scanLimit);
    },
    async listQueuedPuzzleIds() {
      return queuedIds;
    },
  };
}

describe("historical generated-puzzle playtest backfill", () => {
  it("accepts only fully gated current-pipeline boards", () => {
    expect(inspectPuzzleForPlaytestBackfill(eligiblePuzzle())).toEqual({ eligible: true });

    const reserve = eligiblePuzzle("reserve");
    reserve.metadata!.reserveEvidence = {
      corpusVersion: "reserve-v1",
      reserveId: "r1",
      validation: "catalog-grounded-structural-novelty",
    };
    expect(inspectPuzzleForPlaytestBackfill(reserve).reason).toBe("reserve-or-lab");

    const noBoardRecognition = eligiblePuzzle("no-board-recognition");
    noBoardRecognition.metadata!.boardRecognitionProfiles = [];
    expect(inspectPuzzleForPlaytestBackfill(noBoardRecognition).reason).toBe(
      "missing-board-recognition-evidence"
    );

    const wrongBoardProfile = eligiblePuzzle("wrong-board-profile");
    wrongBoardProfile.metadata!.boardRecognitionProfiles![0]!.profileId = "unknown-profile";
    expect(inspectPuzzleForPlaytestBackfill(wrongBoardProfile).reason).toBe(
      "missing-board-recognition-evidence"
    );

    const noVision = eligiblePuzzle("no-vision");
    noVision.metadata!.playabilityEvidence!.blind.profileCount = 1;
    expect(inspectPuzzleForPlaytestBackfill(noVision).reason).toBe(
      "missing-responsive-blind-evidence"
    );

    const wrongProfiles = eligiblePuzzle("wrong-profiles");
    wrongProfiles.metadata!.playabilityEvidence!.blind.profiles[0]!.profileId = "unknown-profile";
    expect(inspectPuzzleForPlaytestBackfill(wrongProfiles).reason).toBe(
      "missing-responsive-blind-evidence"
    );

    const underQuorum = eligiblePuzzle("under-quorum");
    underQuorum.metadata!.playabilityEvidence!.blind.profiles[0]!.judgeCount = 1;
    expect(inspectPuzzleForPlaytestBackfill(underQuorum).reason).toBe(
      "missing-responsive-blind-evidence"
    );

    const noEditorial = eligiblePuzzle("no-editorial");
    noEditorial.metadata!.playabilityEvidence!.editorial.acceptedProfiles = 2;
    expect(inspectPuzzleForPlaytestBackfill(noEditorial).reason).toBe("missing-editorial-evidence");

    const incompleteEditorialProfiles = eligiblePuzzle("incomplete-editorial-profiles");
    incompleteEditorialProfiles.metadata!.playabilityEvidence!.editorial.profileCount = 2;
    expect(inspectPuzzleForPlaytestBackfill(incompleteEditorialProfiles).reason).toBe(
      "missing-editorial-evidence"
    );

    const unicode = eligiblePuzzle("unicode");
    unicode.visual!.mode = "unicode";
    expect(inspectPuzzleForPlaytestBackfill(unicode).reason).toBe("missing-composed-visual");

    const noEstimate = eligiblePuzzle("no-estimate");
    noEstimate.metadata!.estimatedSolveRate = undefined;
    expect(inspectPuzzleForPlaytestBackfill(noEstimate).reason).toBe("missing-solve-estimate");
  });

  it("dry-runs without mutation and reports already queued candidates", async () => {
    const submit = jest.fn();
    const service = createPuzzlePlaytestBackfillService(
      source([eligiblePuzzle("p1"), eligiblePuzzle("p2")], ["p1"]),
      submit
    );
    const report = await service.run({ dryRun: true, now: new Date(0) });

    expect(submit).not.toHaveBeenCalled();
    expect(report).toEqual(
      expect.objectContaining({
        dryRun: true,
        scanned: 2,
        eligible: 2,
        alreadyQueued: 1,
        eligibleUnqueued: 1,
        queued: 0,
      })
    );
  });

  it("queues only eligible unqueued rows with bounded limit and exact evidence", async () => {
    const incomplete = eligiblePuzzle("incomplete");
    incomplete.metadata!.noveltyEvidence = undefined;
    const submit = jest.fn().mockResolvedValue(undefined);
    const service = createPuzzlePlaytestBackfillService(
      source(
        [eligiblePuzzle("p1"), eligiblePuzzle("p2"), eligiblePuzzle("p3"), incomplete],
        ["p1"]
      ),
      submit
    );
    const report = await service.run({ dryRun: false, limit: 1 });

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        puzzleId: "p2",
        answer: "sunflower",
        difficultyScore: 5,
        generationMethod: "apex-tournament",
        automatedEstimatedSolveRate: 0.8,
      })
    );
    expect(report.queued).toBe(1);
    expect(report.eligibleUnqueued).toBe(2);
    expect(report.exclusionReasons["missing-structural-novelty"]).toBe(1);
    expect(report.truncated).toBe(true);
  });

  it("clamps requested limits to the safety boundary", async () => {
    const service = createPuzzlePlaytestBackfillService(source([]), jest.fn());
    expect((await service.run({ limit: 100_000 })).requestedLimit).toBe(200);
    expect((await service.run({ limit: 0 })).requestedLimit).toBe(1);
  });
});
