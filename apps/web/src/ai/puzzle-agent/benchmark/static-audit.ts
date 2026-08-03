import { displayLeaksAnswer, evaluateVisualForPublish, isKnownTechniqueId } from "../quality";
import {
  RESERVE_PUZZLES,
  type ReservePuzzle,
  validateReservePuzzleCorpus,
} from "../reserve-puzzles";
import { evaluateSemanticAlignment } from "../semantic-alignment";
import { type PuzzleVisual, PuzzleVisualSchema } from "../visual/composition";
import { evaluatePictogramPixelIntegrity } from "../visual/pictogram-pixel-integrity";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import { renderPuzzleVisualProfiles } from "../visual/render-board";
import { buildPuzzleSolveBenchmarkCorpus } from "./puzzle-corpus";
import { PUZZLE_GENERATOR_BENCHMARK_VERSION } from "./types";

export const STATIC_PUZZLE_AUDIT_VERSION = "static-puzzle-audit-v2";

export type StaticAuditPuzzle = {
  id: string;
  answer: string;
  rebusPuzzle: string;
  techniqueId: string;
  explanation?: string;
  visual: PuzzleVisual;
  source: "solve-corpus" | "reserve";
};

export type StaticPuzzleAuditItem = {
  id: string;
  source: StaticAuditPuzzle["source"];
  profilesRendered: number;
  passed: boolean;
  failures: string[];
};

export type StaticAssetAuditItem = {
  concept: string;
  passed: boolean;
  failures: string[];
};

export type StaticPuzzleAuditReport = {
  version: typeof STATIC_PUZZLE_AUDIT_VERSION;
  benchmarkVersion: string;
  puzzleCount: number;
  puzzlePassCount: number;
  renderedProfileCount: number;
  expectedRenderedProfileCount: number;
  assetCount: number;
  assetPassCount: number;
  sourceCounts: Record<StaticAuditPuzzle["source"], number>;
  puzzleItems: StaticPuzzleAuditItem[];
  assetItems: StaticAssetAuditItem[];
  failures: string[];
  promotion: { passed: boolean; failures: string[] };
};

export type StaticPuzzleAuditOptions = {
  puzzles?: readonly StaticAuditPuzzle[];
  reserveCorpus?: readonly ReservePuzzle[];
};

function defaultCorpus(): StaticAuditPuzzle[] {
  const solveCorpus = buildPuzzleSolveBenchmarkCorpus().map((entry) => ({
    id: entry.id,
    answer: entry.answer,
    rebusPuzzle: entry.visual.unicodeFallback,
    techniqueId: entry.techniqueId,
    visual: entry.visual,
    source: "solve-corpus" as const,
  }));
  const reserveCorpus = RESERVE_PUZZLES.map((entry) => ({
    id: entry.id,
    answer: entry.answer,
    rebusPuzzle: entry.rebusPuzzle,
    techniqueId: entry.techniqueId,
    explanation: entry.explanation,
    visual: entry.visual,
    source: "reserve" as const,
  }));
  return [...solveCorpus, ...reserveCorpus];
}

function uniquePictograms(puzzles: readonly StaticAuditPuzzle[]) {
  const bySvg = new Map<string, { concept: string; svg: string }>();
  for (const puzzle of puzzles) {
    for (const layer of puzzle.visual.layers) {
      if (layer.kind !== "pictogram" || !layer.svg) continue;
      const key = `${layer.assetId ?? layer.concept}\u0000${layer.svg}`;
      if (!bySvg.has(key)) bySvg.set(key, { concept: layer.concept, svg: layer.svg });
    }
  }
  return [...bySvg.values()].sort((left, right) => left.concept.localeCompare(right.concept));
}

async function auditPuzzle(puzzle: StaticAuditPuzzle): Promise<StaticPuzzleAuditItem> {
  const failures: string[] = [];
  const parsed = PuzzleVisualSchema.safeParse(puzzle.visual);
  if (!parsed.success) {
    failures.push(`Invalid visual schema: ${parsed.error.message}`);
    return { id: puzzle.id, source: puzzle.source, profilesRendered: 0, passed: false, failures };
  }

  const visualCheck = evaluateVisualForPublish(puzzle.visual, {
    // Static audit is no-spend: catalog authenticity + pixel integrity cover
    // offline inventory. Live blind naming is enforced on AI publish.
    requireCatalogRecognitionEvidence: false,
  });
  if (!visualCheck.ok) failures.push(visualCheck.reason ?? "Visual failed publish preflight");
  if (puzzle.rebusPuzzle !== puzzle.visual.unicodeFallback) {
    failures.push("rebusPuzzle does not equal visual.unicodeFallback");
  }
  if (displayLeaksAnswer(puzzle.visual.unicodeFallback, puzzle.answer)) {
    failures.push("Rendered fallback leaks the answer");
  }
  if (!isKnownTechniqueId(puzzle.techniqueId)) {
    failures.push(`Unknown technique: ${puzzle.techniqueId}`);
  }

  const semanticAlignment = evaluateSemanticAlignment({
    answer: puzzle.answer,
    techniqueId: puzzle.techniqueId,
    explanation: puzzle.explanation,
    visual: puzzle.visual,
    requireExplanation: false,
  });
  if (!semanticAlignment.ok) {
    failures.push(
      `Semantic alignment failed (${semanticAlignment.rule}): ${semanticAlignment.blockers.join("; ")}`
    );
  }

  let profilesRendered = 0;
  try {
    profilesRendered = (await renderPuzzleVisualProfiles(puzzle.visual)).length;
    if (profilesRendered !== PUZZLE_BOARD_RECOGNITION_PROFILES.length) {
      failures.push(
        `Rendered ${profilesRendered}/${PUZZLE_BOARD_RECOGNITION_PROFILES.length} production profiles`
      );
    }
  } catch (error) {
    failures.push(
      `Production profile rendering failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return {
    id: puzzle.id,
    source: puzzle.source,
    profilesRendered,
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Run all deterministic generation checks that are safe to execute without
 * Gateway, database, or human-review credentials. This is mechanical evidence
 * only; it intentionally does not claim semantic recognition or playability.
 */
export async function auditStaticPuzzleCorpus(
  options: StaticPuzzleAuditOptions = {}
): Promise<StaticPuzzleAuditReport> {
  const puzzles = options.puzzles ?? defaultCorpus();
  const puzzleItems = await Promise.all(puzzles.map((puzzle) => auditPuzzle(puzzle)));
  const assetItems = await Promise.all(
    uniquePictograms(puzzles).map(async ({ concept, svg }): Promise<StaticAssetAuditItem> => {
      const result = await evaluatePictogramPixelIntegrity(svg);
      return { concept, passed: result.ok, failures: result.reasons };
    })
  );
  const reserveFailures =
    options.puzzles && !options.reserveCorpus
      ? []
      : validateReservePuzzleCorpus(options.reserveCorpus ?? RESERVE_PUZZLES);
  const failures = [
    ...reserveFailures.map((failure) => `reserve-corpus: ${failure}`),
    ...puzzleItems.flatMap((item) =>
      item.failures.map((failure) => `${item.source}:${item.id}: ${failure}`)
    ),
    ...assetItems.flatMap((item) =>
      item.failures.map((failure) => `asset:${item.concept}: ${failure}`)
    ),
  ];
  const sourceCounts = {
    "solve-corpus": puzzles.filter((puzzle) => puzzle.source === "solve-corpus").length,
    reserve: puzzles.filter((puzzle) => puzzle.source === "reserve").length,
  };

  return {
    version: STATIC_PUZZLE_AUDIT_VERSION,
    benchmarkVersion: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    puzzleCount: puzzles.length,
    puzzlePassCount: puzzleItems.filter((item) => item.passed).length,
    renderedProfileCount: puzzleItems.reduce((sum, item) => sum + item.profilesRendered, 0),
    expectedRenderedProfileCount: puzzles.length * PUZZLE_BOARD_RECOGNITION_PROFILES.length,
    assetCount: assetItems.length,
    assetPassCount: assetItems.filter((item) => item.passed).length,
    sourceCounts,
    puzzleItems,
    assetItems,
    failures: Array.from(new Set(failures)),
    promotion: { passed: failures.length === 0, failures: Array.from(new Set(failures)) },
  };
}
