import { createHash, randomUUID } from "node:crypto";
import type { IconRecognitionReview } from "@/db/models";
import {
  CURATED_PICTOGRAM_CATALOG_VERSION,
  getCuratedPictogramAliases,
  listCuratedPictogramIds,
  resolveCuratedPictogram,
} from "../visual/curated-pictograms";

export const HUMAN_ICON_RECOGNITION_CONTRACT_VERSION = "human-icon-recognition-v1";
export const ICON_RECOGNITION_SIZES = [36, 72] as const;
export const ICON_RECOGNITION_MIN_REVIEWERS = 3;
export const ICON_RECOGNITION_RELEASE_ACCURACY = 0.9;
export const ICON_RECOGNITION_MARKET_ACCURACY = 0.97;
export const ICON_RECOGNITION_SPECIMEN_FLOOR = 2 / 3;

export type IconRecognitionSize = (typeof ICON_RECOGNITION_SIZES)[number];

type IconRecognitionFixture = {
  fixtureId: string;
  assetId: string;
  conceptId: string;
  sizePx: IconRecognitionSize;
  svg: string;
};

export type BlindIconRecognitionSpecimen = Pick<
  IconRecognitionFixture,
  "fixtureId" | "sizePx" | "svg"
>;

export type IconRecognitionProgress = {
  completed: number;
  total: number;
  remaining: number;
  complete: boolean;
};

export type IconRecognitionConfusion = {
  intendedConcept: string;
  guessedConcept: string;
  count: number;
};

export type IconRecognitionSizeScore = {
  sizePx: IconRecognitionSize;
  decisions: number;
  correct: number;
  accuracy: number | null;
};

export type IconRecognitionFixtureScore = {
  fixtureId: string;
  conceptId: string;
  sizePx: IconRecognitionSize;
  reviewers: number;
  decisions: number;
  correct: number;
  accuracy: number | null;
};

export type IconRecognitionConceptScore = {
  conceptId: string;
  decisions: number;
  correct: number;
  accuracy: number | null;
  sizes: IconRecognitionSizeScore[];
};

export type IconRecognitionCalibrationReport = {
  contractVersion: typeof HUMAN_ICON_RECOGNITION_CONTRACT_VERSION;
  catalogVersion: typeof CURATED_PICTOGRAM_CATALOG_VERSION;
  fixtureCount: number;
  decisionCount: number;
  reviewerCount: number;
  requiredReviewersPerFixture: number;
  coveredFixtures: number;
  coverageRate: number;
  sizeScores: IconRecognitionSizeScore[];
  conceptScores: IconRecognitionConceptScore[];
  specimenAccuracyFloor: number;
  weakFixtures: IconRecognitionFixtureScore[];
  releaseReady: boolean;
  marketLeadingReady: boolean;
  status: "collecting" | "release-ready" | "market-leading";
  topConfusions: IconRecognitionConfusion[];
  generatedAt: string;
};

export type IconRecognitionRepository = {
  listReviewerDecisions(input: {
    reviewerId: string;
    contractVersion: string;
    catalogVersion: string;
  }): Promise<IconRecognitionReview[]>;
  listCalibrationDecisions(input: {
    contractVersion: string;
    catalogVersion: string;
  }): Promise<IconRecognitionReview[]>;
  insertDecision(review: IconRecognitionReview): Promise<boolean>;
};

export class IconRecognitionConflictError extends Error {
  constructor() {
    super("This specimen has already been answered by this reviewer");
    this.name = "IconRecognitionConflictError";
  }
}

const GENERIC_GUESS_WORDS = new Set([
  "a",
  "an",
  "the",
  "icon",
  "image",
  "picture",
  "pictogram",
  "symbol",
  "drawing",
  "of",
]);

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeIconNamingGuess(value: string): string {
  const words = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (words.length && GENERIC_GUESS_WORDS.has(words[0]!)) words.shift();
  while (words.length && GENERIC_GUESS_WORDS.has(words.at(-1)!)) words.pop();
  return words.join(" ");
}

function aliasLookup(): Map<string, string | null> {
  const lookup = new Map<string, string | null>();
  for (const conceptId of listCuratedPictogramIds()) {
    const aliases = new Set([conceptId, ...getCuratedPictogramAliases(conceptId)]);
    for (const alias of aliases) {
      const normalized = normalizeIconNamingGuess(alias);
      if (!lookup.has(normalized)) {
        lookup.set(normalized, conceptId);
      } else if (lookup.get(normalized) !== conceptId) {
        lookup.set(normalized, null);
      }
    }
  }
  return lookup;
}

const CATALOG_ALIAS_LOOKUP = aliasLookup();

export function resolveIconNamingGuess(value: string): string | undefined {
  const normalized = normalizeIconNamingGuess(value);
  const matched = CATALOG_ALIAS_LOOKUP.get(normalized);
  return matched ?? undefined;
}

export function buildIconRecognitionFixtures(): IconRecognitionFixture[] {
  return listCuratedPictogramIds().flatMap((conceptId) => {
    const asset = resolveCuratedPictogram(conceptId);
    if (!asset) throw new Error(`Catalog asset did not resolve: ${conceptId}`);
    return ICON_RECOGNITION_SIZES.map((sizePx) => ({
      fixtureId: stableHash(
        `${HUMAN_ICON_RECOGNITION_CONTRACT_VERSION}:${CURATED_PICTOGRAM_CATALOG_VERSION}:${asset.assetId}:${sizePx}`
      ).slice(0, 32),
      assetId: asset.assetId,
      conceptId,
      sizePx,
      svg: asset.svg,
    }));
  });
}

function progressFor(total: number, completed: number): IconRecognitionProgress {
  const safeCompleted = Math.min(total, Math.max(0, completed));
  return {
    completed: safeCompleted,
    total,
    remaining: total - safeCompleted,
    complete: safeCompleted === total,
  };
}

function orderedFixtures(reviewerId: string, fixtures: IconRecognitionFixture[]) {
  return [...fixtures].sort((left, right) =>
    stableHash(`${reviewerId}:${left.fixtureId}`).localeCompare(
      stableHash(`${reviewerId}:${right.fixtureId}`)
    )
  );
}

export function scoreIconRecognitionCalibration(input: {
  fixtures?: IconRecognitionFixture[];
  reviews: IconRecognitionReview[];
  minReviewersPerFixture?: number;
  now?: Date;
}): IconRecognitionCalibrationReport {
  const fixtures = input.fixtures ?? buildIconRecognitionFixtures();
  const fixtureIds = new Set(fixtures.map((fixture) => fixture.fixtureId));
  const seenDecisions = new Set<string>();
  const reviews = input.reviews.filter((review) => {
    const decisionKey = `${review.fixtureId}\u0000${review.reviewerId}`;
    const eligible =
      review.contractVersion === HUMAN_ICON_RECOGNITION_CONTRACT_VERSION &&
      review.catalogVersion === CURATED_PICTOGRAM_CATALOG_VERSION &&
      fixtureIds.has(review.fixtureId) &&
      !seenDecisions.has(decisionKey);
    if (eligible) seenDecisions.add(decisionKey);
    return eligible;
  });
  const minReviewers = Math.max(
    1,
    Math.floor(input.minReviewersPerFixture ?? ICON_RECOGNITION_MIN_REVIEWERS)
  );
  const fixtureCounts = new Map<string, Set<string>>();
  for (const review of reviews) {
    const reviewers = fixtureCounts.get(review.fixtureId) ?? new Set<string>();
    reviewers.add(review.reviewerId);
    fixtureCounts.set(review.fixtureId, reviewers);
  }
  const coveredFixtures = fixtures.filter(
    (fixture) => (fixtureCounts.get(fixture.fixtureId)?.size ?? 0) >= minReviewers
  ).length;
  const fullCoverage = coveredFixtures === fixtures.length;
  const sizeScores = ICON_RECOGNITION_SIZES.map((sizePx): IconRecognitionSizeScore => {
    const decisions = reviews.filter((review) => review.sizePx === sizePx);
    const correct = decisions.filter((review) => review.correct).length;
    return {
      sizePx,
      decisions: decisions.length,
      correct,
      accuracy: decisions.length ? correct / decisions.length : null,
    };
  });
  const meetsAccuracy = (threshold: number) =>
    sizeScores.every((score) => score.accuracy !== null && score.accuracy >= threshold);
  const fixtureScores = fixtures.map((fixture): IconRecognitionFixtureScore => {
    const decisions = reviews.filter((review) => review.fixtureId === fixture.fixtureId);
    const correct = decisions.filter((review) => review.correct).length;
    return {
      fixtureId: fixture.fixtureId,
      conceptId: fixture.conceptId,
      sizePx: fixture.sizePx,
      reviewers: fixtureCounts.get(fixture.fixtureId)?.size ?? 0,
      decisions: decisions.length,
      correct,
      accuracy: decisions.length ? correct / decisions.length : null,
    };
  });
  const weakFixtures = fixtureScores
    .filter(
      (score) =>
        score.reviewers >= minReviewers &&
        score.accuracy !== null &&
        score.accuracy < ICON_RECOGNITION_SPECIMEN_FLOOR
    )
    .sort(
      (left, right) =>
        (left.accuracy ?? 1) - (right.accuracy ?? 1) ||
        left.conceptId.localeCompare(right.conceptId) ||
        left.sizePx - right.sizePx
    );
  const noWeakFixtures = weakFixtures.length === 0;
  const releaseReady =
    fullCoverage && noWeakFixtures && meetsAccuracy(ICON_RECOGNITION_RELEASE_ACCURACY);
  const marketLeadingReady =
    fullCoverage && noWeakFixtures && meetsAccuracy(ICON_RECOGNITION_MARKET_ACCURACY);
  const conceptScores = listCuratedPictogramIds()
    .map((conceptId): IconRecognitionConceptScore => {
      const conceptReviews = reviews.filter((review) => review.conceptId === conceptId);
      const correct = conceptReviews.filter((review) => review.correct).length;
      return {
        conceptId,
        decisions: conceptReviews.length,
        correct,
        accuracy: conceptReviews.length ? correct / conceptReviews.length : null,
        sizes: ICON_RECOGNITION_SIZES.map((sizePx): IconRecognitionSizeScore => {
          const sizeReviews = conceptReviews.filter((review) => review.sizePx === sizePx);
          const sizeCorrect = sizeReviews.filter((review) => review.correct).length;
          return {
            sizePx,
            decisions: sizeReviews.length,
            correct: sizeCorrect,
            accuracy: sizeReviews.length ? sizeCorrect / sizeReviews.length : null,
          };
        }),
      };
    })
    .sort(
      (left, right) =>
        (left.accuracy ?? -1) - (right.accuracy ?? -1) ||
        left.conceptId.localeCompare(right.conceptId)
    );
  const confusionCounts = new Map<string, IconRecognitionConfusion>();
  for (const review of reviews) {
    if (review.correct || !review.matchedConceptId) continue;
    const key = `${review.conceptId}\u0000${review.matchedConceptId}`;
    const current = confusionCounts.get(key);
    confusionCounts.set(key, {
      intendedConcept: review.conceptId,
      guessedConcept: review.matchedConceptId,
      count: (current?.count ?? 0) + 1,
    });
  }

  return {
    contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
    catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
    fixtureCount: fixtures.length,
    decisionCount: reviews.length,
    reviewerCount: new Set(reviews.map((review) => review.reviewerId)).size,
    requiredReviewersPerFixture: minReviewers,
    coveredFixtures,
    coverageRate: fixtures.length ? coveredFixtures / fixtures.length : 0,
    sizeScores,
    conceptScores,
    specimenAccuracyFloor: ICON_RECOGNITION_SPECIMEN_FLOOR,
    weakFixtures,
    releaseReady,
    marketLeadingReady,
    status: marketLeadingReady ? "market-leading" : releaseReady ? "release-ready" : "collecting",
    topConfusions: [...confusionCounts.values()]
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.intendedConcept.localeCompare(right.intendedConcept) ||
          left.guessedConcept.localeCompare(right.guessedConcept)
      )
      .slice(0, 12),
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}

export function createIconRecognitionService(repository: IconRecognitionRepository) {
  const fixtures = buildIconRecognitionFixtures();
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture]));

  async function reviewerDecisions(reviewerId: string) {
    return repository.listReviewerDecisions({
      reviewerId,
      contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
      catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
    });
  }

  return {
    async getNext(reviewerIdInput: string): Promise<{
      specimen: BlindIconRecognitionSpecimen | null;
      progress: IconRecognitionProgress;
    }> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const decisions = await reviewerDecisions(reviewerId);
      const completedIds = new Set(decisions.map((decision) => decision.fixtureId));
      const fixture = orderedFixtures(reviewerId, fixtures).find(
        (candidate) => !completedIds.has(candidate.fixtureId)
      );
      return {
        specimen: fixture
          ? { fixtureId: fixture.fixtureId, sizePx: fixture.sizePx, svg: fixture.svg }
          : null,
        progress: progressFor(fixtures.length, completedIds.size),
      };
    },

    async submit(input: {
      reviewerId: string;
      fixtureId: string;
      guess?: string;
      uncertain?: boolean;
      now?: Date;
    }): Promise<IconRecognitionProgress> {
      const reviewerId = input.reviewerId.trim().slice(0, 100);
      const fixtureId = input.fixtureId.trim();
      if (!reviewerId || !fixtureId) throw new Error("Reviewer and specimen are required");
      const fixture = fixtureById.get(fixtureId);
      if (!fixture) throw new Error("Unknown or stale recognition specimen");
      const rawGuess = (input.guess ?? "").trim().slice(0, 100);
      const uncertain = input.uncertain === true || !rawGuess;
      const normalizedGuess = normalizeIconNamingGuess(rawGuess);
      const matchedConceptId = uncertain ? undefined : resolveIconNamingGuess(rawGuess);
      const inserted = await repository.insertDecision({
        id: randomUUID(),
        contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
        catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
        fixtureId,
        assetId: fixture.assetId,
        conceptId: fixture.conceptId,
        sizePx: fixture.sizePx,
        reviewerId,
        rawGuess,
        normalizedGuess,
        matchedConceptId,
        correct: matchedConceptId === fixture.conceptId,
        uncertain,
        createdAt: input.now ?? new Date(),
      });
      if (!inserted) throw new IconRecognitionConflictError();
      const decisions = await reviewerDecisions(reviewerId);
      return progressFor(fixtures.length, new Set(decisions.map((row) => row.fixtureId)).size);
    },

    async getReport(reviewerIdInput: string): Promise<{
      report: IconRecognitionCalibrationReport;
      reviewerProgress: IconRecognitionProgress;
    }> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const [allReviews, reviewerReviews] = await Promise.all([
        repository.listCalibrationDecisions({
          contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
          catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
        }),
        reviewerDecisions(reviewerId),
      ]);
      const reviewerProgress = progressFor(
        fixtures.length,
        new Set(reviewerReviews.map((row) => row.fixtureId)).size
      );
      if (!reviewerProgress.complete) {
        throw new Error("Complete the blind naming panel before viewing calibration results");
      }
      return {
        report: scoreIconRecognitionCalibration({ fixtures, reviews: allReviews }),
        reviewerProgress,
      };
    },
  };
}
