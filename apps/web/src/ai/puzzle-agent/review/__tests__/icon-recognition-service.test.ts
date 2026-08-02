import { describe, expect, it } from "@jest/globals";
import type { IconRecognitionReview } from "@/db/models";
import {
  CURATED_PICTOGRAM_CATALOG_VERSION,
  listCuratedPictogramIds,
} from "../../visual/curated-pictograms";
import { MATERIAL_SYMBOL_CANDIDATE_SOURCE } from "../../visual/material-symbol-candidates";
import {
  buildIconRecognitionFixtures,
  createIconRecognitionService,
  HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
  IconRecognitionConflictError,
  type IconRecognitionRepository,
  normalizeIconNamingGuess,
  resolveIconNamingGuess,
  scoreIconRecognitionCalibration,
} from "../icon-recognition-service";

function memoryRepository() {
  const rows: IconRecognitionReview[] = [];
  const repository: IconRecognitionRepository = {
    async listReviewerDecisions(input) {
      return rows.filter(
        (row) =>
          row.reviewerId === input.reviewerId &&
          row.contractVersion === input.contractVersion &&
          row.catalogVersion === input.catalogVersion
      );
    },
    async listCalibrationDecisions(input) {
      return rows.filter(
        (row) =>
          row.contractVersion === input.contractVersion &&
          row.catalogVersion === input.catalogVersion
      );
    },
    async insertDecision(review) {
      if (
        rows.some(
          (row) => row.fixtureId === review.fixtureId && row.reviewerId === review.reviewerId
        )
      ) {
        return false;
      }
      rows.push(review);
      return true;
    },
  };
  return { rows, repository };
}

function review(input: {
  fixture: ReturnType<typeof buildIconRecognitionFixtures>[number];
  reviewerId: string;
  correct?: boolean;
  matchedConceptId?: string;
}): IconRecognitionReview {
  const correct = input.correct !== false;
  const catalogVersion =
    input.fixture.panelId === "candidates"
      ? `${CURATED_PICTOGRAM_CATALOG_VERSION}+material-symbols-${MATERIAL_SYMBOL_CANDIDATE_SOURCE.commit.slice(0, 12)}`
      : CURATED_PICTOGRAM_CATALOG_VERSION;
  return {
    id: `${input.reviewerId}:${input.fixture.fixtureId}`,
    contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
    catalogVersion,
    fixtureId: input.fixture.fixtureId,
    assetId: input.fixture.assetId,
    conceptId: input.fixture.conceptId,
    sizePx: input.fixture.sizePx,
    reviewerId: input.reviewerId,
    rawGuess: correct ? input.fixture.conceptId : (input.matchedConceptId ?? "unknown"),
    normalizedGuess: correct ? input.fixture.conceptId : (input.matchedConceptId ?? "unknown"),
    matchedConceptId: correct ? input.fixture.conceptId : input.matchedConceptId,
    correct,
    uncertain: !correct && !input.matchedConceptId,
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
  };
}

describe("blind human icon-recognition calibration", () => {
  it("builds one opaque specimen per catalog asset and player size", () => {
    const fixtures = buildIconRecognitionFixtures();

    expect(fixtures).toHaveLength(196);
    expect(new Set(fixtures.map((fixture) => fixture.fixtureId)).size).toBe(196);
    expect(new Set(fixtures.map((fixture) => fixture.sizePx))).toEqual(new Set([36, 72]));
    for (const fixture of fixtures) {
      expect(fixture.fixtureId).toMatch(/^[a-f0-9]{32}$/);
      expect(fixture.fixtureId).not.toContain(fixture.conceptId);
    }
  });

  it("builds an isolated candidate cohort with hidden publication controls", () => {
    const fixtures = buildIconRecognitionFixtures("candidates");

    expect(fixtures).toHaveLength(48);
    expect(fixtures.filter((fixture) => fixture.role === "candidate")).toHaveLength(34);
    expect(fixtures.filter((fixture) => fixture.role === "control")).toHaveLength(14);
    expect(new Set(fixtures.map((fixture) => fixture.fixtureId)).size).toBe(48);
    expect(fixtures.find((fixture) => fixture.conceptId === "computer-mouse")?.assetId).toMatch(
      /^material-symbols:mouse:/
    );
    const publicationFixtureIds = new Set(
      buildIconRecognitionFixtures().map((fixture) => fixture.fixtureId)
    );
    expect(fixtures.some((fixture) => publicationFixtureIds.has(fixture.fixtureId))).toBe(false);
  });

  it("accepts explicit catalog aliases without fuzzy over-credit", () => {
    expect(normalizeIconNamingGuess("An icon of a CAR!")).toBe("car");
    expect(resolveIconNamingGuess("an automobile icon")).toBe("car");
    expect(resolveIconNamingGuess("a picture of a bicycle")).toBe("bicycle");
    expect(resolveIconNamingGuess("a battery icon")).toBe("battery");
    expect(resolveIconNamingGuess("car or bus")).toBeUndefined();
    expect(resolveIconNamingGuess("vehicle")).toBeUndefined();
  });

  it("keeps every canonical publication and candidate label unambiguous", () => {
    const ambiguous = listCuratedPictogramIds({ includeQuarantined: true }).filter(
      (conceptId) => resolveIconNamingGuess(conceptId) !== conceptId
    );

    expect(ambiguous).toEqual([]);
  });

  it("returns a blind payload and records an immutable response without correctness feedback", async () => {
    const store = memoryRepository();
    const service = createIconRecognitionService(store.repository);
    const first = await service.getNext("reviewer-1");

    expect(first.specimen).not.toBeNull();
    expect(Object.keys(first.specimen ?? {}).sort()).toEqual(["fixtureId", "sizePx", "svg"]);
    const fixture = buildIconRecognitionFixtures().find(
      (candidate) => candidate.fixtureId === first.specimen?.fixtureId
    )!;
    const progress = await service.submit({
      reviewerId: "reviewer-1",
      fixtureId: fixture.fixtureId,
      guess: fixture.conceptId,
    });

    expect(progress.completed).toBe(1);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.correct).toBe(true);
    await expect(
      service.submit({
        reviewerId: "reviewer-1",
        fixtureId: fixture.fixtureId,
        guess: fixture.conceptId,
      })
    ).rejects.toBeInstanceOf(IconRecognitionConflictError);
  });

  it("runs a complete candidate review without revealing labels between decisions", async () => {
    const store = memoryRepository();
    const service = createIconRecognitionService(store.repository);
    const fixtures = buildIconRecognitionFixtures("candidates");
    const fixtureById = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture]));

    for (let completed = 0; completed < fixtures.length; completed += 1) {
      const next = await service.getNext("candidate-reviewer", "candidates");
      expect(next.progress.completed).toBe(completed);
      expect(Object.keys(next.specimen ?? {}).sort()).toEqual(["fixtureId", "sizePx", "svg"]);
      const fixture = fixtureById.get(next.specimen!.fixtureId)!;
      await service.submit({
        reviewerId: "candidate-reviewer",
        panelId: "candidates",
        fixtureId: fixture.fixtureId,
        guess: fixture.conceptId,
      });
    }

    const finished = await service.getNext("candidate-reviewer", "candidates");
    expect(finished).toEqual({
      specimen: null,
      progress: { completed: 48, total: 48, remaining: 0, complete: true },
    });
    const { report } = await service.getReport("candidate-reviewer", "candidates");
    expect(report.qualifiedReviewerCount).toBe(1);
    expect(report.releaseReady).toBe(false);
    expect(report.promotionEligibleConceptIds).toEqual([]);
  });

  it("withholds aggregate labels and confusions until the reviewer finishes", async () => {
    const store = memoryRepository();
    const service = createIconRecognitionService(store.repository);

    await expect(service.getReport("reviewer-1")).rejects.toThrow(
      "Complete the blind naming panel"
    );
  });

  it("requires three independent decisions for every specimen before readiness", () => {
    const fixtures = buildIconRecognitionFixtures();
    const oneReviewer = fixtures.map((fixture) => review({ fixture, reviewerId: "reviewer-1" }));
    const report = scoreIconRecognitionCalibration({ fixtures, reviews: oneReviewer });

    expect(report.coverageRate).toBe(0);
    expect(report.releaseReady).toBe(false);
    expect(report.marketLeadingReady).toBe(false);
    expect(report.status).toBe("collecting");
  });

  it("proves the market-leading gate only with full independent 97%+ evidence", () => {
    const fixtures = buildIconRecognitionFixtures();
    const reviews = ["reviewer-1", "reviewer-2", "reviewer-3"].flatMap((reviewerId) =>
      fixtures.map((fixture) => review({ fixture, reviewerId }))
    );
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews,
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(report.coverageRate).toBe(1);
    expect(report.sizeScores.map((score) => score.accuracy)).toEqual([1, 1]);
    expect(report.releaseReady).toBe(true);
    expect(report.marketLeadingReady).toBe(true);
    expect(report.status).toBe("market-leading");
    expect(report.generatedAt).toBe("2026-08-01T12:00:00.000Z");
  });

  it("qualifies replacement candidates only after five complete, control-valid panels", () => {
    const fixtures = buildIconRecognitionFixtures("candidates");
    const reviews = ["reviewer-1", "reviewer-2", "reviewer-3", "reviewer-4", "reviewer-5"].flatMap(
      (reviewerId) => fixtures.map((fixture) => review({ fixture, reviewerId }))
    );
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews,
      panelId: "candidates",
    });

    expect(report.fixtureCount).toBe(48);
    expect(report.targetFixtureCount).toBe(34);
    expect(report.controlFixtureCount).toBe(14);
    expect(report.qualifiedReviewerCount).toBe(5);
    expect(report.excludedReviewerCount).toBe(0);
    expect(report.controlGatePassed).toBe(true);
    expect(report.sizeScores.map((score) => score.accuracy)).toEqual([1, 1]);
    expect(report.marketLeadingReady).toBe(true);
    expect(report.promotionEligibleConceptIds).toHaveLength(17);
    expect(report.blockedCandidateConceptIds).toEqual([]);
  });

  it("does not score partial candidate panels or expose premature promotion evidence", () => {
    const fixtures = buildIconRecognitionFixtures("candidates");
    const reviews = fixtures
      .slice(0, -1)
      .map((fixture) => review({ fixture, reviewerId: "reviewer-partial" }));
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews,
      panelId: "candidates",
    });

    expect(report.submittedDecisionCount).toBe(47);
    expect(report.decisionCount).toBe(0);
    expect(report.submittedReviewerCount).toBe(1);
    expect(report.qualifiedReviewerCount).toBe(0);
    expect(report.excludedReviewerCount).toBe(1);
    expect(report.coverageRate).toBe(0);
    expect(report.promotionEligibleConceptIds).toEqual([]);
    expect(report.blockedCandidateConceptIds).toHaveLength(17);
  });

  it("fails candidate promotion when qualified reviewers miss the hidden controls", () => {
    const fixtures = buildIconRecognitionFixtures("candidates");
    const missedControl = fixtures.find(
      (fixture) => fixture.role === "control" && fixture.sizePx === 36
    )!;
    const reviews = ["reviewer-1", "reviewer-2", "reviewer-3", "reviewer-4", "reviewer-5"].flatMap(
      (reviewerId) =>
        fixtures.map((fixture) =>
          fixture.fixtureId === missedControl.fixtureId
            ? review({ fixture, reviewerId, correct: false })
            : review({ fixture, reviewerId })
        )
    );
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews,
      panelId: "candidates",
    });

    expect(report.qualifiedReviewerCount).toBe(5);
    expect(report.controlGatePassed).toBe(false);
    expect(report.weakControls).toEqual([
      expect.objectContaining({ fixtureId: missedControl.fixtureId, accuracy: 0 }),
    ]);
    expect(report.releaseReady).toBe(false);
    expect(report.promotionEligibleConceptIds).toEqual([]);
  });

  it("blocks one weak candidate even when the cohort average exceeds 97%", () => {
    const fixtures = buildIconRecognitionFixtures("candidates");
    const weakCandidate = fixtures.find(
      (fixture) => fixture.conceptId === "soda" && fixture.sizePx === 36
    )!;
    const reviews = ["reviewer-1", "reviewer-2", "reviewer-3", "reviewer-4", "reviewer-5"].flatMap(
      (reviewerId, reviewerIndex) =>
        fixtures.map((fixture) =>
          fixture.fixtureId === weakCandidate.fixtureId && reviewerIndex < 2
            ? review({ fixture, reviewerId, correct: false, matchedConceptId: "water" })
            : review({ fixture, reviewerId })
        )
    );
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews,
      panelId: "candidates",
    });

    expect(report.sizeScores.find((score) => score.sizePx === 36)?.accuracy).toBeGreaterThan(0.97);
    expect(report.weakFixtures).toEqual([
      expect.objectContaining({ conceptId: "soda", sizePx: 36, accuracy: 0.6 }),
    ]);
    expect(report.marketLeadingReady).toBe(false);
    expect(report.promotionEligibleConceptIds).not.toContain("soda");
    expect(report.blockedCandidateConceptIds).toEqual(["soda"]);
  });

  it("blocks promotion when a single unusable icon is hidden by a 97%+ catalog average", () => {
    const fixtures = buildIconRecognitionFixtures();
    const badFixture = fixtures.find(
      (fixture) => fixture.conceptId === "car" && fixture.sizePx === 36
    )!;
    const reviews = ["reviewer-1", "reviewer-2", "reviewer-3"].flatMap((reviewerId) =>
      fixtures.map((fixture) =>
        fixture.fixtureId === badFixture.fixtureId
          ? review({ fixture, reviewerId, correct: false, matchedConceptId: "bus" })
          : review({ fixture, reviewerId })
      )
    );
    const report = scoreIconRecognitionCalibration({ fixtures, reviews });

    expect(report.sizeScores.find((score) => score.sizePx === 36)?.accuracy).toBeGreaterThan(0.97);
    expect(report.weakFixtures).toEqual([
      expect.objectContaining({ conceptId: "car", sizePx: 36, accuracy: 0 }),
    ]);
    expect(report.releaseReady).toBe(false);
    expect(report.marketLeadingReady).toBe(false);
    expect(report.conceptScores.find((score) => score.conceptId === "car")?.accuracy).toBe(0.5);
  });

  it("reports semantic confusion pairs and ignores duplicate reviewer rows", () => {
    const fixtures = buildIconRecognitionFixtures();
    const car36 = fixtures.find((fixture) => fixture.conceptId === "car" && fixture.sizePx === 36)!;
    const wrong = review({
      fixture: car36,
      reviewerId: "reviewer-1",
      correct: false,
      matchedConceptId: "bus",
    });
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews: [wrong, { ...wrong, id: "duplicate" }],
    });

    expect(report.decisionCount).toBe(1);
    expect(report.topConfusions).toEqual([
      { intendedConcept: "car", guessedConcept: "bus", count: 1 },
    ]);
  });
});
