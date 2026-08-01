/**
 * Shared puzzle-agent tool implementations.
 * Used by both the Eve agent (`agent/tools/*`) and the in-process ToolLoopAgent.
 */

import { createHash } from "node:crypto";
import { getCollection } from "@/db/mongodb";
import { getPuzzleTypeConfig, listPuzzleTypes } from "../config/puzzle-types";
import { calibrateDifficulty } from "../services/difficulty-calibrator";
import {
  calculateUniquenessScore,
  createPuzzleFingerprint,
  extractComponents,
  validateUniqueness,
} from "../services/uniqueness-tracker";
import {
  DIFFICULTY_LEVELS,
  type DifficultyTier,
  getDifficultyLevelByTier,
  getDifficultyLevelForScore,
  isDifficultyInBand,
  snapToDifficultyBand,
} from "./difficulty-levels";
import {
  computeFunScore,
  displayLeaksAnswer,
  evaluateVisualForPublish,
  explanationMapsAnswer,
  hintLeaksAnswerEarly,
  isKnownTechniqueId,
  normalizeAnswerKey,
} from "./quality";
import type { CandidatePuzzle } from "./schemas";
import { getTechniques, listAllTechniques, type TechniqueId } from "./technique-library";

function resolvePrompt(
  value: string | ((params: Record<string, unknown>) => string) | undefined,
  params: Record<string, unknown> = {}
): string | null {
  if (!value) return null;
  return typeof value === "function" ? value(params) : value;
}

export async function getPuzzleTypeSpec(input: { puzzleType: string; targetDifficulty?: number }) {
  const config = getPuzzleTypeConfig(input.puzzleType);
  const targetDifficulty = input.targetDifficulty ?? 6;
  const level = getDifficultyLevelForScore(targetDifficulty);
  const promptParams = { targetDifficulty, puzzleType: input.puzzleType };
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    availableTypes: listPuzzleTypes(),
    difficultyRanges: config.difficulty.ranges,
    targetLevel: {
      tier: level.tier,
      label: level.label,
      band: { min: level.min, max: level.max },
      componentBudget: level.componentBudget,
    },
    requiredFields: config.validation.requiredFields,
    generationGuidance: resolvePrompt(config.generation.systemPrompt, promptParams),
    userPromptTemplate: resolvePrompt(config.generation.userPromptTemplate, promptParams),
    hintCount: config.hints.count,
  };
}

export async function getDifficultyBrief(input: {
  targetDifficulty?: number;
  tier?: DifficultyTier;
}) {
  const level = input.tier
    ? getDifficultyLevelByTier(input.tier)
    : getDifficultyLevelForScore(input.targetDifficulty ?? 6);

  const techniques = getTechniques(level.techniques);

  return {
    level: {
      tier: level.tier,
      label: level.label,
      min: level.min,
      max: level.max,
      target: level.target,
      blurb: level.blurb,
      playerPromise: level.playerPromise,
      componentBudget: level.componentBudget,
      hintStyle: level.hintStyle,
      avoid: level.avoid,
    },
    recommendedTechniques: techniques,
    allTiers: DIFFICULTY_LEVELS.map((l) => ({
      tier: l.tier,
      label: l.label,
      min: l.min,
      max: l.max,
      target: l.target,
    })),
    rule: "Final calibrated difficulty MUST land inside this tier's min/max band.",
  };
}

export async function listTechniqueLibrary(input: { techniqueIds?: string[] }) {
  if (input.techniqueIds?.length) {
    return { techniques: getTechniques(input.techniqueIds) };
  }
  return { techniques: listAllTechniques() };
}

export async function listRecentAnswers(input: { lookbackDays?: number; limit?: number }) {
  const lookbackDays = input.lookbackDays ?? 60;
  const limit = Math.min(input.limit ?? 40, 100);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const puzzles = await getCollection("puzzles")
    .find({ createdAt: { $gte: cutoff } })
    .project({ answer: 1, category: 1, puzzle: 1, rebusPuzzle: 1, difficulty: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return {
    count: puzzles.length,
    answers: puzzles.map((p) => ({
      answer: String(p.answer ?? ""),
      category: String(p.category ?? ""),
      difficulty: typeof p.difficulty === "number" ? p.difficulty : null,
      tier:
        typeof p.difficulty === "number" ? getDifficultyLevelForScore(p.difficulty).label : null,
      preview: String(
        (p as { rebusPuzzle?: string; puzzle?: string }).rebusPuzzle ?? p.puzzle ?? ""
      ).slice(0, 80),
    })),
  };
}

export function proposeConceptSeeds(input: {
  targetDifficulty: number;
  theme?: string;
  category?: string;
  avoidAnswers?: string[];
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const techniques = getTechniques(level.techniques);

  const theme = input.theme?.trim();
  const category = input.category?.trim() || "visual_wordplay";
  const avoidKeys = new Set((input.avoidAnswers ?? []).map((a) => normalizeAnswerKey(a)));

  const pick = (id: string | undefined, fallback: TechniqueId): TechniqueId => {
    if (id && techniques.some((t) => t.id === id)) return id as TechniqueId;
    return (techniques[0]?.id as TechniqueId) ?? fallback;
  };

  const seedIdeas = [
    {
      workingTitle: theme ? `${theme} compound` : `${level.label} everyday compound`,
      answerDirection: theme
        ? `Invent a fresh common phrase/compound tied to "${theme}" — not a banned answer`
        : "Familiar 1–2 word compound with a clean visual split",
      category,
      techniqueId: pick(techniques[0]?.id, "simple_compound"),
      layerPlan: "pictogram + pictogram (or pictogram + text) with clear order",
      whyItFitsTier: level.playerPromise,
    },
    {
      workingTitle: "Sound-alike pivot",
      answerDirection: "One clear homophone leap; say the board out loud to verify",
      category: "phonetic",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("homophone") || t.id.includes("phonetic"))?.id,
        "single_homophone"
      ),
      layerPlan: "pictogram for the sound cue + literal partner",
      whyItFitsTier: "Phonetic leaps scale with difficulty when layered carefully",
    },
    {
      workingTitle: "Space means meaning",
      answerDirection: "Positional/prepositional phrase where layout IS the word",
      category: "positional",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("positional") || t.id.includes("spatial"))?.id,
        "basic_positional"
      ),
      layerPlan: "stack/overlay layout; avoid ambiguous prepositions",
      whyItFitsTier: level.blurb,
    },
    {
      workingTitle: "Idiom as picture",
      answerDirection: "Widely known idiom rendered literally (no niche slang)",
      category: "idiom",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("idiom"))?.id,
        "idiom_as_picture"
      ),
      layerPlan: "pictogram for the punch image + text for the rest of the idiom",
      whyItFitsTier: "Share-worthy aha that still fits the tier budget",
    },
    {
      workingTitle: "Typography game",
      answerDirection: "Size, strike, stack, or case carries one semantic beat",
      category: "typography",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("size") || t.id.includes("case"))?.id,
        "size_or_case_semantics"
      ),
      layerPlan: "styled text layer (large/strike/stacked) + one supporting pictogram",
      whyItFitsTier: "Typography-as-gameplay feels premium and generative",
    },
  ].filter((s) => {
    const key = normalizeAnswerKey(s.answerDirection);
    return !avoidKeys.has(key) && !avoidKeys.has(normalizeAnswerKey(s.workingTitle));
  });

  return {
    tier: level.label,
    band: { min: level.min, max: level.max },
    componentBudget: level.componentBudget,
    recommendedTechniques: techniques.map((t) => t.id),
    bannedAnswerKeys: [...avoidKeys].slice(0, 40),
    seeds: seedIdeas,
    note: "Seeds are starting points — invent a fresh answer not in bannedAnswerKeys / recent answers. Pictogram concepts must be concrete nouns (bee, clock, key) — never abstract words alone. Then call compose_puzzle_visual.",
  };
}

export function assembleVisualComponents(input: {
  answer: string;
  rebusPuzzle: string;
  techniqueId?: string;
  targetDifficulty: number;
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const components = extractComponents(input.rebusPuzzle);
  const emojiCount = components.emojis.length;
  const totalParts =
    emojiCount + components.text.length + components.arrows.length + components.symbols.length;

  const issues: string[] = [];
  const tips: string[] = [];

  if (totalParts < level.componentBudget.min) {
    issues.push(
      `Too sparse for ${level.label}: have ${totalParts} parts, want ≥ ${level.componentBudget.min}`
    );
  }
  if (totalParts > level.componentBudget.max) {
    issues.push(
      `Too dense for ${level.label}: have ${totalParts} parts, want ≤ ${level.componentBudget.max}`
    );
  }

  if (displayLeaksAnswer(input.rebusPuzzle, input.answer)) {
    issues.push("Answer text appears in the visual — hide it");
  }

  if (emojiCount === 0 && !/[↑↓←→/+\-×÷]/.test(input.rebusPuzzle)) {
    tips.push("Prefer compose_puzzle_visual with pictograms — unicode-only boards rarely publish");
  }

  let technique = null;
  const knownTechnique = isKnownTechniqueId(input.techniqueId);
  if (input.techniqueId) {
    const found = getTechniques([input.techniqueId])[0];
    technique = found ?? null;
    if (found) {
      tips.push(...found.howToAssemble.slice(0, 2));
    } else {
      issues.push(`Unknown techniqueId: ${input.techniqueId}`);
    }
  }

  const withinBudget =
    totalParts >= level.componentBudget.min && totalParts <= level.componentBudget.max;

  const funScore = computeFunScore({
    techniqueId: input.techniqueId,
    knownTechnique,
    withinBudget,
    issueCount: issues.length,
    generativeParts: 0,
    unicodeParts: emojiCount + components.symbols.length,
    hasSpatialOrOperator:
      components.arrows.length > 0 || /[/+\-×÷]/.test(input.rebusPuzzle),
    hasStyledText: false,
    explanationMapsWell: false,
  });

  return {
    components,
    totalParts,
    tier: level.label,
    componentBudget: level.componentBudget,
    withinBudget,
    technique,
    funScore,
    issues,
    tips,
  };
}

export function craftHintLadder(input: {
  answer: string;
  explanation: string;
  rebusPuzzle: string;
  targetDifficulty: number;
  existingHints?: string[];
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const answer = input.answer.trim();
  const words = answer.split(/\s+/).filter(Boolean);
  const firstLetter = answer[0]?.toUpperCase() ?? "?";
  const mechanism =
    /sound|phonetic|homophone/i.test(input.explanation)
      ? "Say the pieces out loud — a sound-alike may be hiding."
      : /over|under|between|position|above|below/i.test(input.explanation)
        ? "Placement matters as much as the pictures."
        : "Look for how the pieces combine into a familiar phrase.";

  const spoilerSafeExplain = input.explanation
    .replace(new RegExp(escapeRegExpSafe(answer), "ig"), "the answer")
    .slice(0, 72);

  const ladder = [
    `Think about the ${words.length > 1 ? "phrase" : "word"} category — not the literal picture alone.`,
    mechanism,
    `Notice the relationship between parts (${spoilerSafeExplain}${spoilerSafeExplain.length >= 72 ? "…" : ""}).`,
    words.length > 1
      ? `The answer has ${words.length} words.`
      : `The answer is a single word.`,
    // Final hint only: one first-letter nudge — never a full letter scaffold
    `Final nudge: it starts with "${firstLetter}".`,
  ].slice(0, Math.max(3, Math.min(5, level.componentBudget.max + 1)));

  const merged = input.existingHints?.length
    ? [...input.existingHints.slice(0, 2), ...ladder].slice(0, 5)
    : ladder;

  const safe = merged.map((h) =>
    h.toLowerCase().includes(answer.toLowerCase())
      ? h.replace(new RegExp(escapeRegExpSafe(answer), "ig"), "_____")
      : h
  );

  const leakIssues = hintLeaksAnswerEarly(safe, answer);

  return {
    tier: level.label,
    hintStyle: level.hintStyle,
    hints: safe,
    issues: leakIssues,
    guidance:
      "Hints must progress vague → specific. Never dump the full answer or a letter scaffold before the final hint.",
  };
}

function escapeRegExpSafe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stressTestSolvability(
  input: CandidatePuzzle & { targetDifficulty?: number; techniqueId?: string }
) {
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);
  const assembly = assembleVisualComponents({
    answer: input.answer,
    rebusPuzzle: input.rebusPuzzle,
    techniqueId: input.techniqueId,
    targetDifficulty: target,
  });

  const blockers: string[] = [];
  const passes: string[] = [];

  if (!input.explanation || input.explanation.length < 20) {
    blockers.push("Explanation too thin to teach the mapping");
  } else {
    passes.push("Explanation present");
  }

  if ((input.hints?.length ?? 0) < 3) {
    blockers.push("Need ≥ 3 progressive hints for fair play");
  } else {
    passes.push("Hint count OK");
  }

  if (assembly.issues.length) {
    blockers.push(...assembly.issues);
  } else {
    passes.push("Component budget OK for tier");
  }

  const answerWords = input.answer.trim().split(/\s+/);
  if (answerWords.some((w) => w.length > 14)) {
    blockers.push("Unusually long token — may feel unfair");
  }

  if (displayLeaksAnswer(input.rebusPuzzle, input.answer)) {
    blockers.push("Answer leaked into the puzzle display");
  }

  if (!explanationMapsAnswer(input.explanation, input.answer)) {
    blockers.push("Explanation does not clearly map visuals to the answer");
  } else {
    passes.push("Explanation maps to answer");
  }

  const hintLeaks = hintLeaksAnswerEarly(input.hints ?? [], input.answer);
  if (hintLeaks.length) {
    blockers.push(...hintLeaks);
  } else if ((input.hints?.length ?? 0) >= 3) {
    passes.push("Hints do not over-reveal early");
  }

  if (!isKnownTechniqueId(input.techniqueId)) {
    blockers.push("Missing or unknown techniqueId");
  } else {
    passes.push(`Technique ${input.techniqueId}`);
  }

  const solvable = blockers.length === 0;
  return {
    solvable,
    tier: level.label,
    confidence: solvable ? 0.88 : Math.max(0.15, 0.65 - blockers.length * 0.12),
    passes,
    blockers,
    recommendation: solvable
      ? "Fair for publication after uniqueness/quality checks"
      : "Revise visuals, explanation, or hints before publishing",
  };
}

export async function checkUniqueness(
  input: CandidatePuzzle & { techniqueId?: string }
) {
  const display = input.rebusPuzzle;
  const fingerprint = createPuzzleFingerprint({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
    techniqueId: input.techniqueId,
  });

  // Hard ban: answer reuse across the FULL archive (active + retired)
  const { isAnswerRegistered } = await import("../learning/answer-registry");
  const archiveHit = await isAnswerRegistered(input.answer);

  const uniqueness = await validateUniqueness({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
    explanation: input.explanation,
  });

  const isUnique = uniqueness.isUnique && !archiveHit.taken;

  const uniquenessScore = isUnique
    ? await calculateUniquenessScore({
        rebusPuzzle: display,
        answer: input.answer,
        category: input.category,
        explanation: input.explanation,
      })
    : 0;

  const recommendations = [...(uniqueness.recommendations ?? [])];
  if (archiveHit.taken) {
    recommendations.unshift(
      `Answer already in archive${archiveHit.active === false ? " (retired puzzle)" : ""} — invent a different phrase`
    );
  }

  return {
    fingerprint,
    isUnique,
    similarityScore: archiveHit.taken ? 1 : uniqueness.similarityScore,
    uniquenessScore,
    conflictingPuzzles: uniqueness.conflictingPuzzles,
    recommendations,
    exactAnswerCollision: archiveHit.taken,
    conflictingPuzzleId: archiveHit.puzzleId,
  };
}

export async function calibratePuzzleDifficulty(
  input: CandidatePuzzle & { puzzleType?: string; targetDifficulty?: number }
) {
  const puzzleType = input.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);
  const target = input.targetDifficulty ?? input.difficulty;

  let calibratedDifficulty: number;
  let method: "type_config" | "ai" = "type_config";
  let profile: unknown;

  if (config.difficulty?.calculate) {
    calibratedDifficulty = config.difficulty.calculate(input as never);
  } else {
    method = "ai";
    const calibration = await calibrateDifficulty({
      rebusPuzzle: input.rebusPuzzle,
      answer: input.answer,
      proposedDifficulty: input.difficulty,
      hints: input.hints,
    });
    calibratedDifficulty = calibration.calibratedDifficulty;
    profile = calibration.difficultyProfile;
  }

  const snapped = snapToDifficultyBand(calibratedDifficulty);
  const level = getDifficultyLevelForScore(target);
  const inBand = isDifficultyInBand(calibratedDifficulty, target);

  return {
    // Never lie: keep the measured score. Callers must reject !inBand.
    calibratedDifficulty: snapped,
    rawCalibrated: calibratedDifficulty,
    method,
    proposedDifficulty: input.difficulty,
    targetDifficulty: target,
    tier: level.label,
    tierBand: { min: level.min, max: level.max },
    inBand,
    adjustment: inBand
      ? "Within target tier"
      : `Off-band for ${level.label} (${level.min}–${level.max}). Redesign complexity — do not publish by forcing the target.`,
    profile,
  };
}

/** Fast heuristic quality score (no extra model call). */
export function scorePuzzleQuality(
  input: CandidatePuzzle & {
    targetDifficulty?: number;
    techniqueId?: string;
    visual?: {
      mode?: string;
      layers?: Array<{
        kind: string;
        svg?: string;
        src?: string;
        content?: string;
        emphasis?: string;
      }>;
      unicodeFallback?: string;
    };
  }
) {
  const issues: string[] = [];
  const strengths: string[] = [];
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);

  const puzzle = (input.visual?.unicodeFallback || input.rebusPuzzle).trim();
  const answer = input.answer.trim();

  if (!puzzle) issues.push("Empty puzzle display");
  if (!answer) issues.push("Empty answer");
  if (displayLeaksAnswer(puzzle, answer)) {
    issues.push("Answer appears literally in the puzzle text");
  }
  if (!input.explanation || input.explanation.length < 24) {
    issues.push("Explanation too short — must teach the visual→answer mapping");
  } else if (!explanationMapsAnswer(input.explanation, answer)) {
    issues.push("Explanation does not clearly map visuals to the answer");
  } else {
    strengths.push("Explanation maps cleanly");
  }
  if (!input.hints || input.hints.length < 3) {
    issues.push("Need at least 3 progressive hints");
  } else {
    const hintLeaks = hintLeaksAnswerEarly(input.hints, answer);
    if (hintLeaks.length) issues.push(...hintLeaks);
    else strengths.push(`${input.hints.length} progressive hints`);
  }
  if (!isKnownTechniqueId(input.techniqueId)) {
    issues.push("Missing or unknown techniqueId — pick a named technique from the library");
  } else {
    strengths.push(`Technique ${input.techniqueId}`);
  }

  const assembly = assembleVisualComponents({
    answer,
    rebusPuzzle: puzzle,
    techniqueId: input.techniqueId,
    targetDifficulty: target,
  });
  if (!assembly.withinBudget) {
    issues.push(...assembly.issues.filter((i) => !issues.includes(i)));
  } else {
    strengths.push(`Component budget fits ${level.label}`);
  }

  const visualCheck = evaluateVisualForPublish(input.visual);
  if (!visualCheck.ok) {
    issues.push(visualCheck.reason ?? "Visual failed publish check");
  } else {
    strengths.push(
      visualCheck.pictogramSvgCount > 0
        ? `Generative Ink Pictograms (${visualCheck.pictogramSvgCount})`
        : "Styled generative text layers"
    );
  }

  const styledText = Boolean(
    input.visual?.layers?.some(
      (l) =>
        l.kind === "text" &&
        l.emphasis &&
        ["large", "small", "strike", "stacked", "tiny"].includes(l.emphasis)
    )
  );

  const funScore = computeFunScore({
    techniqueId: input.techniqueId,
    knownTechnique: isKnownTechniqueId(input.techniqueId),
    withinBudget: assembly.withinBudget,
    issueCount: issues.length,
    generativeParts: visualCheck.pictogramSvgCount + (styledText ? 1 : 0),
    unicodeParts: assembly.components.emojis.length + assembly.components.symbols.length,
    hasSpatialOrOperator:
      assembly.components.arrows.length > 0 || /[/+\-×÷]/.test(puzzle),
    hasStyledText: styledText,
    explanationMapsWell: explanationMapsAnswer(input.explanation ?? "", answer),
  });

  if (funScore >= 70) strengths.push("High craft / fun score");

  let score = 68;
  score -= issues.length * 12;
  score += Math.min(14, strengths.length * 3);
  score += Math.round((funScore - 55) / 8);
  if (visualCheck.ok && isKnownTechniqueId(input.techniqueId)) score += 8;
  score = Math.max(0, Math.min(100, score));

  const verdict =
    score >= 85
      ? ("excellent" as const)
      : score >= 70
        ? ("good" as const)
        : score >= 60
          ? ("acceptable" as const)
          : score >= 45
            ? ("needs_work" as const)
            : ("reject" as const);

  return {
    overall: score,
    verdict,
    strengths,
    issues,
    funScore,
    tier: level.label,
    publishable:
      score >= 70 &&
      issues.length === 0 &&
      isKnownTechniqueId(input.techniqueId) &&
      visualCheck.ok &&
      funScore >= 65,
  };
}

export function validatePuzzleCandidate(
  input: CandidatePuzzle & {
    puzzleType?: string;
    targetDifficulty?: number;
    techniqueId?: string;
    visual?: {
      mode?: string;
      layers?: Array<{ kind: string; svg?: string; content?: string; emphasis?: string }>;
      unicodeFallback?: string;
    };
  }
) {
  const puzzleType = input.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);

  const errors: string[] = [];

  if (config.validation?.validate) {
    const result = config.validation.validate(input as never);
    if (!result.valid) errors.push(...(result.errors ?? []));
  }

  if (!isKnownTechniqueId(input.techniqueId)) {
    errors.push("techniqueId must be a known library technique");
  }

  const visualCheck = evaluateVisualForPublish(input.visual);
  if (!visualCheck.ok) {
    errors.push(visualCheck.reason ?? "Visual failed publish check");
  }

  const quality = scorePuzzleQuality({ ...input, targetDifficulty: target });
  if (!quality.publishable) errors.push(...quality.issues);

  if (!isDifficultyInBand(input.difficulty, target)) {
    errors.push(
      `Proposed difficulty ${input.difficulty} outside ${level.label} band ${level.min}-${level.max}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    puzzleType,
    tier: level.label,
  };
}

export function fingerprintCandidate(
  input: Pick<CandidatePuzzle, "rebusPuzzle" | "answer" | "category">
) {
  return createPuzzleFingerprint(input);
}

export function stableId(...parts: string[]) {
  return createHash("sha256").update(parts.join("::")).digest("hex").slice(0, 16);
}

export { composePuzzleVisual } from "./visual/compose-visual";
export { generateImageTile } from "./visual/generate-image-tile";
export { generatePictogram } from "./visual/generate-pictogram";

export type { TechniqueId };
