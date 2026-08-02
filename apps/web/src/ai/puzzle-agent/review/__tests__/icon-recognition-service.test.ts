import { describe, expect, it } from "@jest/globals";
import type { IconRecognitionReview } from "@/db/models";
import { CURATED_PICTOGRAM_CATALOG_VERSION } from "../../visual/curated-pictograms";
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
  return {
    id: `${input.reviewerId}:${input.fixture.fixtureId}`,
    contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
    catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
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

    expect(fixtures).toHaveLength(236);
    expect(new Set(fixtures.map((fixture) => fixture.fixtureId)).size).toBe(236);
    expect(new Set(fixtures.map((fixture) => fixture.sizePx))).toEqual(new Set([36, 72]));
    for (const fixture of fixtures) {
      expect(fixture.fixtureId).toMatch(/^[a-f0-9]{32}$/);
      expect(fixture.fixtureId).not.toContain(fixture.conceptId);
    }
  });

  it("accepts explicit catalog aliases without fuzzy over-credit", () => {
    expect(normalizeIconNamingGuess("An icon of a CAR!")).toBe("car");
    expect(resolveIconNamingGuess("an automobile icon")).toBe("car");
    expect(resolveIconNamingGuess("a picture of a bicycle")).toBe("bicycle");
    expect(resolveIconNamingGuess("car or bus")).toBeUndefined();
    expect(resolveIconNamingGuess("vehicle")).toBeUndefined();
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
