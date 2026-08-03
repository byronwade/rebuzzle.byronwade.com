import { createHash, randomUUID } from "node:crypto";
import type { IconRecognitionReview } from "@/db/models";
import {
  CURATED_PICTOGRAM_CATALOG_VERSION,
  getCuratedPictogramAliases,
  listCuratedPictogramIds,
  resolveCuratedPictogram,
} from "../visual/curated-pictograms";
import {
  listMaterialSymbolCandidateIds,
  MATERIAL_SYMBOL_CANDIDATE_SOURCE,
} from "../visual/material-symbol-candidates";
import { PLAYER_ICON_GATE_SIZES } from "../visual/presentation";

/** v3 aligns blind naming specimens to live player tile sizes (44px + 72px). */
export const HUMAN_ICON_RECOGNITION_CONTRACT_VERSION = "human-icon-recognition-v3";
export const ICON_RECOGNITION_SIZES = PLAYER_ICON_GATE_SIZES;
export const ICON_RECOGNITION_MIN_REVIEWERS = 3;
export const ICON_RECOGNITION_CANDIDATE_MIN_REVIEWERS = 5;
export const ICON_RECOGNITION_RELEASE_ACCURACY = 0.9;
export const ICON_RECOGNITION_MARKET_ACCURACY = 0.97;
export const ICON_RECOGNITION_SPECIMEN_FLOOR = 2 / 3;
export const ICON_RECOGNITION_CANDIDATE_SPECIMEN_FLOOR = 0.8;
export const ICON_RECOGNITION_CONTROL_SCREEN_ACCURACY = 0.85;
export const ICON_RECOGNITION_CONTROL_GATE_ACCURACY = 0.95;

export const ICON_RECOGNITION_PANEL_IDS = ["publication", "candidates"] as const;
export type IconRecognitionPanelId = (typeof ICON_RECOGNITION_PANEL_IDS)[number];

const CANDIDATE_CONTROL_CONCEPT_IDS = [
  "bicycle",
  "car",
  "clock",
  "crown",
  "envelope",
  "fish",
  "key",
] as const;

type IconRecognitionFixtureRole = "publication" | "candidate" | "control";

type IconRecognitionPanelConfig = {
  id: IconRecognitionPanelId;
  catalogVersion: string;
  conceptIds: string[];
  candidateConceptIds: Set<string>;
  controlConceptIds: Set<string>;
  minReviewers: number;
  specimenFloor: number;
};

export type IconRecognitionSize = (typeof ICON_RECOGNITION_SIZES)[number];

type IconRecognitionFixture = {
  fixtureId: string;
  assetId: string;
  conceptId: string;
  sizePx: IconRecognitionSize;
  svg: string;
  panelId: IconRecognitionPanelId;
  role: IconRecognitionFixtureRole;
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
  role: IconRecognitionFixtureRole;
  reviewers: number;
  decisions: number;
  correct: number;
  accuracy: number | null;
};

export type IconRecognitionConceptScore = {
  conceptId: string;
  role: IconRecognitionFixtureRole;
  decisions: number;
  correct: number;
  accuracy: number | null;
  sizes: IconRecognitionSizeScore[];
};

export type IconRecognitionCalibrationReport = {
  contractVersion: typeof HUMAN_ICON_RECOGNITION_CONTRACT_VERSION;
  catalogVersion: string;
  panelId: IconRecognitionPanelId;
  fixtureCount: number;
  targetFixtureCount: number;
  controlFixtureCount: number;
  submittedDecisionCount: number;
  decisionCount: number;
  submittedReviewerCount: number;
  reviewerCount: number;
  qualifiedReviewerCount: number;
  excludedReviewerCount: number;
  requiredReviewersPerFixture: number;
  coveredFixtures: number;
  coverageRate: number;
  sizeScores: IconRecognitionSizeScore[];
  controlSizeScores: IconRecognitionSizeScore[];
  controlGateAccuracy: number;
  controlGatePassed: boolean;
  conceptScores: IconRecognitionConceptScore[];
  specimenAccuracyFloor: number;
  weakFixtures: IconRecognitionFixtureScore[];
  weakControls: IconRecognitionFixtureScore[];
  promotionEligibleConceptIds: string[];
  blockedCandidateConceptIds: string[];
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

function panelConfig(panelId: IconRecognitionPanelId): IconRecognitionPanelConfig {
  if (panelId === "candidates") {
    const candidateConceptIds = new Set(listMaterialSymbolCandidateIds());
    const controlConceptIds = new Set<string>(CANDIDATE_CONTROL_CONCEPT_IDS);
    return {
      id: panelId,
      catalogVersion: `${CURATED_PICTOGRAM_CATALOG_VERSION}+material-symbols-${MATERIAL_SYMBOL_CANDIDATE_SOURCE.commit.slice(0, 12)}`,
      conceptIds: [...candidateConceptIds, ...controlConceptIds],
      candidateConceptIds,
      controlConceptIds,
      minReviewers: ICON_RECOGNITION_CANDIDATE_MIN_REVIEWERS,
      specimenFloor: ICON_RECOGNITION_CANDIDATE_SPECIMEN_FLOOR,
    };
  }
  return {
    id: panelId,
    catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
    conceptIds: listCuratedPictogramIds(),
    candidateConceptIds: new Set(),
    controlConceptIds: new Set(),
    minReviewers: ICON_RECOGNITION_MIN_REVIEWERS,
    specimenFloor: ICON_RECOGNITION_SPECIMEN_FLOOR,
  };
}

export function normalizeIconRecognitionPanelId(value: unknown): IconRecognitionPanelId {
  return value === "candidates" ? "candidates" : "publication";
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
  for (const conceptId of listCuratedPictogramIds({ includeQuarantined: true })) {
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

export function buildIconRecognitionFixtures(
  panelIdInput: IconRecognitionPanelId = "publication"
): IconRecognitionFixture[] {
  const config = panelConfig(panelIdInput);
  return config.conceptIds.flatMap((conceptId) => {
    const isCandidate = config.candidateConceptIds.has(conceptId);
    const asset = resolveCuratedPictogram(conceptId, { includeQuarantined: isCandidate });
    if (!asset) throw new Error(`Catalog asset did not resolve: ${conceptId}`);
    return ICON_RECOGNITION_SIZES.map((sizePx) => ({
      fixtureId: stableHash(
        `${HUMAN_ICON_RECOGNITION_CONTRACT_VERSION}:${config.id}:${config.catalogVersion}:${asset.assetId}:${sizePx}`
      ).slice(0, 32),
      assetId: asset.assetId,
      conceptId,
      sizePx,
      svg: asset.svg,
      panelId: config.id,
      role: isCandidate
        ? "candidate"
        : config.controlConceptIds.has(conceptId)
          ? "control"
          : "publication",
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
  panelId?: IconRecognitionPanelId;
  minReviewersPerFixture?: number;
  now?: Date;
}): IconRecognitionCalibrationReport {
  const panelId = normalizeIconRecognitionPanelId(input.panelId ?? input.fixtures?.[0]?.panelId);
  const config = panelConfig(panelId);
  const fixtures = input.fixtures ?? buildIconRecognitionFixtures(panelId);
  const fixtureIds = new Set(fixtures.map((fixture) => fixture.fixtureId));
  const seenDecisions = new Set<string>();
  const submittedReviews = input.reviews.filter((review) => {
    const decisionKey = `${review.fixtureId}\u0000${review.reviewerId}`;
    const eligible =
      review.contractVersion === HUMAN_ICON_RECOGNITION_CONTRACT_VERSION &&
      review.catalogVersion === config.catalogVersion &&
      fixtureIds.has(review.fixtureId) &&
      !seenDecisions.has(decisionKey);
    if (eligible) seenDecisions.add(decisionKey);
    return eligible;
  });
  const minReviewers = Math.max(1, Math.floor(input.minReviewersPerFixture ?? config.minReviewers));
  const controlFixtures = fixtures.filter((fixture) => fixture.role === "control");
  const controlFixtureIds = new Set(controlFixtures.map((fixture) => fixture.fixtureId));
  const submittedReviewerIds = new Set(submittedReviews.map((review) => review.reviewerId));
  const qualifiedReviewerIds = new Set<string>();
  for (const reviewerId of submittedReviewerIds) {
    if (panelId === "publication") {
      qualifiedReviewerIds.add(reviewerId);
      continue;
    }
    const reviewerReviews = submittedReviews.filter((review) => review.reviewerId === reviewerId);
    const completedFixtureIds = new Set(reviewerReviews.map((review) => review.fixtureId));
    const controlReviews = reviewerReviews.filter((review) =>
      controlFixtureIds.has(review.fixtureId)
    );
    const controlCorrect = controlReviews.filter((review) => review.correct).length;
    const controlAccuracy = controlReviews.length ? controlCorrect / controlReviews.length : 0;
    if (
      completedFixtureIds.size === fixtures.length &&
      controlReviews.length === controlFixtures.length &&
      controlAccuracy >= ICON_RECOGNITION_CONTROL_SCREEN_ACCURACY
    ) {
      qualifiedReviewerIds.add(reviewerId);
    }
  }
  const reviews = submittedReviews.filter((review) => qualifiedReviewerIds.has(review.reviewerId));
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
  const targetFixtures = fixtures.filter((fixture) => fixture.role !== "control");
  const targetFixtureIds = new Set(targetFixtures.map((fixture) => fixture.fixtureId));
  const targetReviews = reviews.filter((review) => targetFixtureIds.has(review.fixtureId));
  const controlReviews = reviews.filter((review) => controlFixtureIds.has(review.fixtureId));
  const sizeScores = ICON_RECOGNITION_SIZES.map((sizePx): IconRecognitionSizeScore => {
    const decisions = targetReviews.filter((review) => review.sizePx === sizePx);
    const correct = decisions.filter((review) => review.correct).length;
    return {
      sizePx,
      decisions: decisions.length,
      correct,
      accuracy: decisions.length ? correct / decisions.length : null,
    };
  });
  const controlSizeScores = ICON_RECOGNITION_SIZES.map((sizePx): IconRecognitionSizeScore => {
    const decisions = controlReviews.filter((review) => review.sizePx === sizePx);
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
      role: fixture.role,
      reviewers: fixtureCounts.get(fixture.fixtureId)?.size ?? 0,
      decisions: decisions.length,
      correct,
      accuracy: decisions.length ? correct / decisions.length : null,
    };
  });
  const weakFixtures = fixtureScores
    .filter(
      (score) =>
        score.role !== "control" &&
        score.reviewers >= minReviewers &&
        score.accuracy !== null &&
        score.accuracy < config.specimenFloor
    )
    .sort(
      (left, right) =>
        (left.accuracy ?? 1) - (right.accuracy ?? 1) ||
        left.conceptId.localeCompare(right.conceptId) ||
        left.sizePx - right.sizePx
    );
  const weakControls = fixtureScores
    .filter(
      (score) =>
        score.role === "control" &&
        score.reviewers >= minReviewers &&
        score.accuracy !== null &&
        score.accuracy < ICON_RECOGNITION_CONTROL_SCREEN_ACCURACY
    )
    .sort(
      (left, right) =>
        (left.accuracy ?? 1) - (right.accuracy ?? 1) ||
        left.conceptId.localeCompare(right.conceptId) ||
        left.sizePx - right.sizePx
    );
  const controlGatePassed =
    panelId === "publication" ||
    (controlFixtures.every(
      (fixture) => (fixtureCounts.get(fixture.fixtureId)?.size ?? 0) >= minReviewers
    ) &&
      controlSizeScores.every(
        (score) =>
          score.accuracy !== null && score.accuracy >= ICON_RECOGNITION_CONTROL_GATE_ACCURACY
      ));
  const noWeakFixtures = weakFixtures.length === 0;
  const releaseReady =
    fullCoverage &&
    controlGatePassed &&
    noWeakFixtures &&
    meetsAccuracy(ICON_RECOGNITION_RELEASE_ACCURACY);
  const marketLeadingReady =
    fullCoverage &&
    controlGatePassed &&
    noWeakFixtures &&
    meetsAccuracy(ICON_RECOGNITION_MARKET_ACCURACY);
  const targetConceptIds = [...new Set(targetFixtures.map((fixture) => fixture.conceptId))];
  const conceptScores = targetConceptIds
    .map((conceptId): IconRecognitionConceptScore => {
      const conceptReviews = targetReviews.filter((review) => review.conceptId === conceptId);
      const correct = conceptReviews.filter((review) => review.correct).length;
      return {
        conceptId,
        role: config.candidateConceptIds.has(conceptId) ? "candidate" : "publication",
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
  const promotionEligibleConceptIds =
    panelId === "candidates" && controlGatePassed
      ? conceptScores
          .flatMap((score) =>
            score.role === "candidate" &&
            score.accuracy !== null &&
            score.accuracy >= ICON_RECOGNITION_RELEASE_ACCURACY &&
            score.sizes.every(
              (size) =>
                size.decisions >= minReviewers &&
                size.accuracy !== null &&
                size.accuracy >= config.specimenFloor
            )
              ? [score.conceptId]
              : []
          )
          .sort()
      : [];
  const promotionEligibleSet = new Set(promotionEligibleConceptIds);
  const blockedCandidateConceptIds = [...config.candidateConceptIds]
    .filter((conceptId) => !promotionEligibleSet.has(conceptId))
    .sort();
  const confusionCounts = new Map<string, IconRecognitionConfusion>();
  for (const review of targetReviews) {
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
    catalogVersion: config.catalogVersion,
    panelId,
    fixtureCount: fixtures.length,
    targetFixtureCount: targetFixtures.length,
    controlFixtureCount: controlFixtures.length,
    submittedDecisionCount: submittedReviews.length,
    decisionCount: reviews.length,
    submittedReviewerCount: submittedReviewerIds.size,
    reviewerCount: qualifiedReviewerIds.size,
    qualifiedReviewerCount: qualifiedReviewerIds.size,
    excludedReviewerCount: submittedReviewerIds.size - qualifiedReviewerIds.size,
    requiredReviewersPerFixture: minReviewers,
    coveredFixtures,
    coverageRate: fixtures.length ? coveredFixtures / fixtures.length : 0,
    sizeScores,
    controlSizeScores,
    controlGateAccuracy: ICON_RECOGNITION_CONTROL_GATE_ACCURACY,
    controlGatePassed,
    conceptScores,
    specimenAccuracyFloor: config.specimenFloor,
    weakFixtures,
    weakControls,
    promotionEligibleConceptIds,
    blockedCandidateConceptIds,
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
  const panels = new Map(
    ICON_RECOGNITION_PANEL_IDS.map((panelId) => {
      const fixtures = buildIconRecognitionFixtures(panelId);
      return [
        panelId,
        {
          config: panelConfig(panelId),
          fixtures,
          fixtureById: new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture])),
          fixtureIds: new Set(fixtures.map((fixture) => fixture.fixtureId)),
        },
      ] as const;
    })
  );

  function panel(panelIdInput: unknown) {
    const panelId = normalizeIconRecognitionPanelId(panelIdInput);
    return panels.get(panelId)!;
  }

  async function reviewerDecisions(reviewerId: string, panelId: IconRecognitionPanelId) {
    const current = panel(panelId);
    return repository.listReviewerDecisions({
      reviewerId,
      contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
      catalogVersion: current.config.catalogVersion,
    });
  }

  function completedFixtureIds(
    decisions: IconRecognitionReview[],
    fixtureIds: Set<string>
  ): Set<string> {
    return new Set(
      decisions.flatMap((decision) => (fixtureIds.has(decision.fixtureId) ? [decision.fixtureId] : []))
    );
  }

  return {
    async getNext(
      reviewerIdInput: string,
      panelIdInput: IconRecognitionPanelId = "publication"
    ): Promise<{
      specimen: BlindIconRecognitionSpecimen | null;
      progress: IconRecognitionProgress;
    }> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const panelId = normalizeIconRecognitionPanelId(panelIdInput);
      const current = panel(panelId);
      const decisions = await reviewerDecisions(reviewerId, panelId);
      const completedIds = completedFixtureIds(decisions, current.fixtureIds);
      const fixture = orderedFixtures(reviewerId, current.fixtures).find(
        (candidate) => !completedIds.has(candidate.fixtureId)
      );
      return {
        specimen: fixture
          ? { fixtureId: fixture.fixtureId, sizePx: fixture.sizePx, svg: fixture.svg }
          : null,
        progress: progressFor(current.fixtures.length, completedIds.size),
      };
    },

    async submit(input: {
      reviewerId: string;
      panelId?: IconRecognitionPanelId;
      fixtureId: string;
      guess?: string;
      uncertain?: boolean;
      now?: Date;
    }): Promise<IconRecognitionProgress> {
      const reviewerId = input.reviewerId.trim().slice(0, 100);
      const fixtureId = input.fixtureId.trim();
      if (!reviewerId || !fixtureId) throw new Error("Reviewer and specimen are required");
      const panelId = normalizeIconRecognitionPanelId(input.panelId);
      const current = panel(panelId);
      const fixture = current.fixtureById.get(fixtureId);
      if (!fixture) throw new Error("Unknown or stale recognition specimen");
      const rawGuess = (input.guess ?? "").trim().slice(0, 100);
      const uncertain = input.uncertain === true || !rawGuess;
      const normalizedGuess = normalizeIconNamingGuess(rawGuess);
      const matchedConceptId = uncertain ? undefined : resolveIconNamingGuess(rawGuess);
      const inserted = await repository.insertDecision({
        id: randomUUID(),
        contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
        catalogVersion: current.config.catalogVersion,
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
      const decisions = await reviewerDecisions(reviewerId, panelId);
      return progressFor(
        current.fixtures.length,
        completedFixtureIds(decisions, current.fixtureIds).size
      );
    },

    async getReport(
      reviewerIdInput: string,
      panelIdInput: IconRecognitionPanelId = "publication"
    ): Promise<{
      report: IconRecognitionCalibrationReport;
      reviewerProgress: IconRecognitionProgress;
    }> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const panelId = normalizeIconRecognitionPanelId(panelIdInput);
      const current = panel(panelId);
      const [allReviews, reviewerReviews] = await Promise.all([
        repository.listCalibrationDecisions({
          contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
          catalogVersion: current.config.catalogVersion,
        }),
        reviewerDecisions(reviewerId, panelId),
      ]);
      const reviewerProgress = progressFor(
        current.fixtures.length,
        completedFixtureIds(reviewerReviews, current.fixtureIds).size
      );
      if (!reviewerProgress.complete) {
        throw new Error("Complete the blind naming panel before viewing calibration results");
      }
      return {
        report: scoreIconRecognitionCalibration({
          fixtures: current.fixtures,
          reviews: allReviews,
          panelId,
        }),
        reviewerProgress,
      };
    },
  };
}
