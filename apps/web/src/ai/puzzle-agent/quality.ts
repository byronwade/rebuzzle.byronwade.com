/**
 * Shared publish-quality helpers for Eve / ToolLoopAgent generation.
 * Keep heuristics here so assemble, compose, score, and gates stay aligned.
 */

import {
  type DifficultyTierLabel,
  getDifficultyLevelForScore,
  isDifficultyInBand,
} from "./difficulty-levels";
import { TECHNIQUE_LIBRARY, type TechniqueId } from "./technique-library";
import { isAuthenticCuratedPictogram } from "./visual/curated-pictograms";
import { scorePictogramClarity } from "./visual/pictogram-clarity";

export const TECHNIQUE_IDS = Object.keys(TECHNIQUE_LIBRARY) as TechniqueId[];

export function isKnownTechniqueId(id: string | undefined | null): id is TechniqueId {
  return Boolean(id && id in TECHNIQUE_LIBRARY);
}

export function isTechniqueAllowedForTarget(
  techniqueId: string | undefined | null,
  targetDifficulty: number
): boolean {
  if (!isKnownTechniqueId(techniqueId)) return false;
  const level = getDifficultyLevelForScore(targetDifficulty);
  // Prefer tier techniques, but allow adjacent known techniques as soft OK
  if (level.techniques.includes(techniqueId)) return true;
  // Hard/Difficult can use each other's simpler techniques; Evil/Impossible more open
  return isKnownTechniqueId(techniqueId);
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when the puzzle display literally leaks the answer.
 * Short answers (≤3 chars) only match as whole tokens to avoid false positives.
 */
export function displayLeaksAnswer(display: string, answer: string): boolean {
  const d = display.toLowerCase().trim();
  const a = answer.toLowerCase().trim();
  if (!d || !a) return false;
  if (d === a) return true;

  if (a.length <= 3) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(a)}([^a-z0-9]|$)`, "i");
    return re.test(d);
  }

  return d.includes(a);
}

/** Normalize answers for exact-duplicate checks. */
export function normalizeAnswerKey(answer: string): string {
  return answer.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type FunScoreSignals = {
  techniqueId?: string;
  knownTechnique: boolean;
  withinBudget: boolean;
  issueCount: number;
  /** Structured visual energy (pictograms / styled text) — capped */
  generativeParts: number;
  /** Legacy unicode emoji / arrows / symbols — heavily capped */
  unicodeParts: number;
  hasSpatialOrOperator: boolean;
  hasStyledText: boolean;
  explanationMapsWell: boolean;
  /** Average pictogram clarity 0–100 when SVGs were scored */
  avgPictogramClarity?: number | null;
};

/**
 * Fun score from craft signals, not asset padding.
 * Padding emoji/pictogram count cannot alone clear a high threshold.
 */
export function computeFunScore(signals: FunScoreSignals): number {
  let score = 42;

  if (signals.knownTechnique) score += 22;
  else if (signals.techniqueId) score += 4;
  else score -= 14;

  if (signals.withinBudget) score += 10;
  else score -= 12;

  // Generative craft (capped)
  score += Math.min(14, signals.generativeParts * 5);
  // Unicode garnish (hard-capped — prevents emoji salad)
  score += Math.min(8, signals.unicodeParts * 2);

  if (signals.hasSpatialOrOperator) score += 8;
  if (signals.hasStyledText) score += 6;
  if (signals.explanationMapsWell) score += 8;

  if (typeof signals.avgPictogramClarity === "number") {
    if (signals.avgPictogramClarity >= 72) score += 8;
    else if (signals.avgPictogramClarity >= 58) score += 3;
    else score -= 16;
  }

  score -= signals.issueCount * 12;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export type VisualPublishCheck = {
  ok: boolean;
  reason?: string;
  mode?: string;
  pictogramSvgCount: number;
  textLayerCount: number;
};

export function evaluateVisualForPublish(visual?: {
  mode?: string;
  unicodeFallback?: string;
  layers?: Array<{
    kind: string;
    svg?: string;
    concept?: string;
    assetId?: string;
    source?: "catalog" | "generated" | "approved-cache";
    recognitionProfiles?: Array<{ tileSize: number; seenAs: string; confidence: number }>;
    content?: string;
    emphasis?: string;
  }>;
}): VisualPublishCheck {
  if (!visual) {
    return {
      ok: false,
      reason: "Missing generative visual — compose_puzzle_visual is required",
      pictogramSvgCount: 0,
      textLayerCount: 0,
    };
  }

  const layers = visual.layers ?? [];
  const pictogramLayers = layers.filter((l) => l.kind === "pictogram" && l.svg);
  const pictogramSvgCount = pictogramLayers.length;
  const textLayerCount = layers.filter((l) => l.kind === "text").length;
  const styledText = layers.some(
    (l) =>
      l.kind === "text" &&
      l.emphasis &&
      ["large", "small", "strike", "stacked", "tiny"].includes(l.emphasis)
  );

  for (const layer of pictogramLayers) {
    if (
      layer.source === "catalog" &&
      isAuthenticCuratedPictogram({
        concept: layer.concept ?? "",
        assetId: layer.assetId,
        svg: layer.svg,
      })
    ) {
      continue;
    }
    if (layer.source === "generated" || !layer.source) {
      return {
        ok: false,
        reason:
          layer.source === "generated"
            ? `Generated pictogram "${layer.concept ?? "unknown"}" is pending human approval`
            : `Pictogram "${layer.concept ?? "unknown"}" has no trusted asset provenance`,
        mode: visual.mode,
        pictogramSvgCount,
        textLayerCount,
      };
    }
    if (
      layer.source === "approved-cache" &&
      (!layer.assetId ||
        ![36, 72].every((size) =>
          layer.recognitionProfiles?.some((profile) => profile.tileSize === size)
        ))
    ) {
      return {
        ok: false,
        reason: `Approved pictogram "${layer.concept ?? "unknown"}" is missing current player-size evidence`,
        mode: visual.mode,
        pictogramSvgCount,
        textLayerCount,
      };
    }
    const clarity = scorePictogramClarity(layer.svg);
    if (!clarity.ok) {
      return {
        ok: false,
        reason: `Unreadable pictogram SVG (${clarity.reasons.join(", ") || "low clarity"}) — redraw with a clearer silhouette`,
        mode: visual.mode,
        pictogramSvgCount,
        textLayerCount,
      };
    }
  }

  if (visual.mode === "unicode" && pictogramSvgCount === 0 && !styledText) {
    return {
      ok: false,
      reason: "Unicode-only emoji salad — need composed pictogram or styled text layers",
      mode: visual.mode,
      pictogramSvgCount,
      textLayerCount,
    };
  }

  if (pictogramSvgCount === 0 && textLayerCount === 0) {
    return {
      ok: false,
      reason: "Visual has no pictogram SVG or text layers",
      mode: visual.mode,
      pictogramSvgCount,
      textLayerCount,
    };
  }

  return {
    ok: true,
    mode: visual.mode,
    pictogramSvgCount,
    textLayerCount,
  };
}

/**
 * Detect hints that dump the answer too early (letter scaffolds, full answer, etc.).
 */
export function hintLeaksAnswerEarly(hints: string[], answer: string): string[] {
  const problems: string[] = [];
  const a = answer.trim();
  const aLower = a.toLowerCase();
  const letters = a.replace(/[^a-zA-Z]/g, "");

  hints.forEach((hint, index) => {
    const h = hint.trim();
    const hLower = h.toLowerCase();

    if (hLower.includes(aLower) && a.length > 2) {
      problems.push(`Hint ${index + 1} contains the full answer`);
      return;
    }

    // Letter scaffold like "c_a_t" or "C _ A _ T"
    const scaffoldLetters = (h.match(/[a-zA-Z]/g) || []).join("").toLowerCase();
    const underscored = (h.match(/_/g) || []).length >= 2;
    if (
      underscored &&
      letters.length >= 4 &&
      scaffoldLetters.length >= Math.ceil(letters.length * 0.5) &&
      letters.toLowerCase().startsWith(scaffoldLetters.slice(0, 2))
    ) {
      // Only allow heavy scaffolds on the final hint
      if (index < hints.length - 1) {
        problems.push(`Hint ${index + 1} reveals too much of the letter pattern`);
      }
    }

    // "starts with X" before last hint is OK for first letter only once;
    // ban multi-letter prefixes early
    const prefixMatch = h.match(/starts with ["']([a-zA-Z]{2,})["']/i);
    if (prefixMatch && index < hints.length - 1) {
      problems.push(`Hint ${index + 1} reveals a multi-letter prefix too early`);
    }
  });

  return problems;
}

export function explanationMapsAnswer(explanation: string, answer: string): boolean {
  if (!explanation || explanation.trim().length < 24) return false;
  const words = answer
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return explanation.length >= 40;
  // At least one answer token referenced, or clear mapping language
  const e = explanation.toLowerCase();
  const mentionsToken = words.some((w) => e.includes(w));
  const mappingLanguage =
    /because|maps?|stands for|reads as|sounds like|position|over|under|between|compound/i.test(
      explanation
    );
  return mentionsToken || mappingLanguage;
}

export type PublishGateInput = {
  rebusPuzzle: string;
  answer: string;
  explanation?: string;
  hints?: string[];
  techniqueId?: string;
  difficulty?: number;
  targetDifficulty: number;
  qualityOverall: number;
  funScore: number;
  qualityThreshold: number;
  minFunScore: number;
  publishable?: boolean;
  qualityIssues?: string[];
  visual?: {
    mode?: string;
    unicodeFallback?: string;
    layers?: Array<{ kind: string; svg?: string; content?: string; emphasis?: string }>;
  };
  isUnique?: boolean;
  uniquenessScore?: number;
  uniquenessBlockers?: string[];
  solvable?: boolean;
  solvabilityBlockers?: string[];
  calibratedDifficulty?: number;
  inBand?: boolean;
};

export type PublishGateResult = { ok: true } | { ok: false; reason: string };

/**
 * Hard publish gates — used after the agent returns structured output.
 */
export function evaluatePublishGates(input: PublishGateInput): PublishGateResult {
  const visualFallback = input.visual?.unicodeFallback?.trim();
  const display = (visualFallback || input.rebusPuzzle || "").trim();
  const answer = (input.answer || "").trim();

  if (!display) return { ok: false, reason: "Empty puzzle display" };
  if (!answer) return { ok: false, reason: "Empty answer" };
  if (displayLeaksAnswer(display, answer)) {
    return { ok: false, reason: "Answer leaked into puzzle text" };
  }
  if (!isKnownTechniqueId(input.techniqueId)) {
    return {
      ok: false,
      reason: "Missing or unknown techniqueId — pick from the technique library",
    };
  }
  if (!isTechniqueAllowedForTarget(input.techniqueId, input.targetDifficulty)) {
    return { ok: false, reason: `Technique ${input.techniqueId} not allowed for target tier` };
  }

  if (
    input.visual &&
    visualFallback &&
    input.rebusPuzzle.trim() &&
    input.rebusPuzzle.trim() !== visualFallback
  ) {
    return { ok: false, reason: "rebusPuzzle must equal visual.unicodeFallback" };
  }

  const visualCheck = evaluateVisualForPublish(input.visual);
  if (!visualCheck.ok) {
    return { ok: false, reason: visualCheck.reason ?? "Visual failed publish check" };
  }

  if (input.qualityOverall < input.qualityThreshold) {
    return {
      ok: false,
      reason: `Quality ${input.qualityOverall} below threshold ${input.qualityThreshold}`,
    };
  }
  if (input.funScore < input.minFunScore) {
    return {
      ok: false,
      reason: `funScore ${input.funScore} below ${input.minFunScore}`,
    };
  }
  if (input.publishable === false) {
    return {
      ok: false,
      reason: `Not publishable: ${(input.qualityIssues || []).join("; ") || "failed quality checks"}`,
    };
  }

  if ((input.hints?.length ?? 0) < 3) {
    return { ok: false, reason: "Need at least 3 progressive hints" };
  }

  const hintProblems = hintLeaksAnswerEarly(input.hints ?? [], answer);
  if (hintProblems.length) {
    return { ok: false, reason: hintProblems[0]! };
  }

  if (input.isUnique === false) {
    return {
      ok: false,
      reason: `Puzzle is not unique: ${input.uniquenessBlockers?.join("; ") || "recent catalog collision"}`,
    };
  }
  if (typeof input.uniquenessScore === "number" && input.uniquenessScore < 50) {
    return { ok: false, reason: `Uniqueness score ${input.uniquenessScore} too low` };
  }

  if (input.solvable === false) {
    return {
      ok: false,
      reason: `Not solvable/fair: ${(input.solvabilityBlockers || []).join("; ") || "failed stress test"}`,
    };
  }

  if (typeof input.calibratedDifficulty === "number") {
    const bandOk =
      input.inBand ?? isDifficultyInBand(input.calibratedDifficulty, input.targetDifficulty);
    if (!bandOk) {
      return {
        ok: false,
        reason: `Calibrated difficulty ${input.calibratedDifficulty} outside target band`,
      };
    }
  }

  if (
    typeof input.difficulty === "number" &&
    !isDifficultyInBand(input.difficulty, input.targetDifficulty)
  ) {
    return {
      ok: false,
      reason: `Proposed difficulty ${input.difficulty} outside target band`,
    };
  }

  return { ok: true };
}

export function tierLabelForScore(score: number): DifficultyTierLabel {
  return getDifficultyLevelForScore(score).label;
}
