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
  getDifficultyLevelByTier,
  getDifficultyLevelForScore,
  isDifficultyInBand,
  type DifficultyTier,
  snapToDifficultyBand,
} from "./difficulty-levels";
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
        typeof p.difficulty === "number"
          ? getDifficultyLevelForScore(p.difficulty).label
          : null,
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
  const techniques = getTechniques(level.techniques).slice(0, 4);

  const theme = input.theme?.trim();
  const category = input.category?.trim() || "visual_wordplay";
  const avoid = new Set((input.avoidAnswers ?? []).map((a) => a.toLowerCase()));

  const seedIdeas = [
    {
      workingTitle: theme ? `${theme} twist` : `${level.label} everyday object`,
      answerDirection: theme
        ? `Common phrase or compound tied to "${theme}"`
        : "Familiar compound or idiom",
      category,
      techniqueId: techniques[0]?.id ?? "simple_compound",
      whyItFitsTier: level.playerPromise,
    },
    {
      workingTitle: "Sound-alike pivot",
      answerDirection: "Answer hinges on one clear homophone",
      category: "phonetic",
      techniqueId: techniques.find((t) => t.id.includes("homophone"))?.id ?? "single_homophone",
      whyItFitsTier: "Phonetic leaps scale well with difficulty when layered carefully",
    },
    {
      workingTitle: "Space means meaning",
      answerDirection: "Positional/prepositional phrase",
      category: "positional",
      techniqueId: techniques.find((t) => t.id.includes("positional") || t.id.includes("spatial"))
        ?.id ?? "basic_positional",
      whyItFitsTier: level.blurb,
    },
  ].filter((s) => !avoid.has(s.workingTitle.toLowerCase()));

  return {
    tier: level.label,
    band: { min: level.min, max: level.max },
    componentBudget: level.componentBudget,
    seeds: seedIdeas,
    note: "Seeds are starting points — invent a fresh answer not in recent answers.",
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

  const answerLower = input.answer.toLowerCase().trim();
  const puzzleLower = input.rebusPuzzle.toLowerCase();
  if (puzzleLower.includes(answerLower) && answerLower.length > 3) {
    issues.push("Answer text appears in the visual — hide it");
  }

  if (emojiCount === 0 && !/[↑↓←→\/+\-×÷]/.test(input.rebusPuzzle)) {
    tips.push("Add emoji or spatial/math symbols so it feels like a rebus");
  }

  let technique = null;
  if (input.techniqueId) {
    const found = getTechniques([input.techniqueId])[0];
    technique = found ?? null;
    if (found) {
      tips.push(...found.howToAssemble.slice(0, 2));
    }
  }

  // Reward technique fit + spatial structure; cap emoji so agents can't pad for funScore
  const emojiBonus = Math.min(12, emojiCount * 3);
  const funScore = Math.max(
    0,
    Math.min(
      100,
      50 +
        emojiBonus +
        components.arrows.length * 8 +
        components.symbols.length * 4 +
        (technique ? 18 : -12) -
        issues.length * 15
    )
  );

  return {
    components,
    totalParts,
    tier: level.label,
    componentBudget: level.componentBudget,
    withinBudget:
      totalParts >= level.componentBudget.min && totalParts <= level.componentBudget.max,
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

  const ladder = [
    `Think about the ${words.length > 1 ? "phrase" : "word"} category — not the literal picture alone.`,
    level.hintStyle.split("→")[0]?.trim() || "Notice how the pieces relate.",
    `Focus on how the visuals map to sounds or positions (see: ${input.explanation.slice(0, 80)}…).`,
    words.length > 1
      ? `The answer has ${words.length} words; the first starts with "${words[0]![0]!.toUpperCase()}".`
      : `The answer is one word starting with "${answer[0]!.toUpperCase()}".`,
    `Almost there: structure like "${answer
      .split("")
      .map((c, i) => (i % 3 === 0 ? c : "_"))
      .join("")}".`,
  ].slice(0, Math.max(3, Math.min(5, level.componentBudget.max)));

  const merged = input.existingHints?.length
    ? [...input.existingHints.slice(0, 2), ...ladder].slice(0, 5)
    : ladder;

  // Never include full answer in hints
  const safe = merged.map((h) =>
    h.toLowerCase().includes(answer.toLowerCase())
      ? h.replace(new RegExp(answer, "ig"), "_____")
      : h
  );

  return {
    tier: level.label,
    hintStyle: level.hintStyle,
    hints: safe,
    guidance: "Hints must progress vague → specific and never dump the full answer early.",
  };
}

export function stressTestSolvability(input: CandidatePuzzle & { targetDifficulty?: number }) {
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);
  const assembly = assembleVisualComponents({
    answer: input.answer,
    rebusPuzzle: input.rebusPuzzle,
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

  const solvable = blockers.length === 0;
  return {
    solvable,
    tier: level.label,
    confidence: solvable ? 0.85 : Math.max(0.2, 0.7 - blockers.length * 0.15),
    passes,
    blockers,
    recommendation: solvable
      ? "Fair for publication after uniqueness/quality checks"
      : "Revise visuals or hints before publishing",
  };
}

export async function checkUniqueness(input: CandidatePuzzle) {
  const display = input.rebusPuzzle;
  const fingerprint = createPuzzleFingerprint({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
  });

  const uniqueness = await validateUniqueness({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
    explanation: input.explanation,
  });

  const uniquenessScore = uniqueness.isUnique
    ? await calculateUniquenessScore({
        rebusPuzzle: display,
        answer: input.answer,
        category: input.category,
        explanation: input.explanation,
      })
    : 0;

  return {
    fingerprint,
    isUnique: uniqueness.isUnique,
    similarityScore: uniqueness.similarityScore,
    uniquenessScore,
    conflictingPuzzles: uniqueness.conflictingPuzzles,
    recommendations: uniqueness.recommendations,
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
  let profile: unknown = undefined;

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
  const inBand = isDifficultyInBand(snapped, target);

  return {
    calibratedDifficulty: inBand ? snapped : level.target,
    rawCalibrated: calibratedDifficulty,
    method,
    proposedDifficulty: input.difficulty,
    targetDifficulty: target,
    tier: level.label,
    tierBand: { min: level.min, max: level.max },
    inBand,
    adjustment: inBand
      ? "Within target tier"
      : `Snapped toward ${level.label} target (${level.target}) — revise complexity if persistently off-band`,
    profile,
  };
}

/** Fast heuristic quality score (no extra model call). */
export function scorePuzzleQuality(
  input: CandidatePuzzle & { targetDifficulty?: number; techniqueId?: string }
) {
  const issues: string[] = [];
  const strengths: string[] = [];
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);

  const puzzle = input.rebusPuzzle.trim();
  const answer = input.answer.trim();

  if (!puzzle) issues.push("Empty puzzle display");
  if (!answer) issues.push("Empty answer");
  if (puzzle.toLowerCase() === answer.toLowerCase()) {
    issues.push("Puzzle text must not equal the answer");
  }
  if (puzzle.toLowerCase().includes(answer.toLowerCase()) && answer.length > 3) {
    issues.push("Answer appears literally in the puzzle text");
  }
  if (!input.explanation || input.explanation.length < 12) {
    issues.push("Explanation too short");
  } else {
    strengths.push("Has an explanation");
  }
  if (!input.hints || input.hints.length < 3) {
    issues.push("Need at least 3 progressive hints");
  } else {
    strengths.push(`${input.hints.length} hints`);
  }
  if (!input.techniqueId) {
    issues.push("Missing techniqueId — pick a named technique from the library");
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
    issues.push(...assembly.issues);
  } else {
    strengths.push(`Component budget fits ${level.label}`);
  }

  if (assembly.funScore >= 70) strengths.push("High fun / visual energy");

  const hasEmoji = /[\p{Emoji}]/u.test(puzzle);
  if (hasEmoji) strengths.push("Uses visual emoji elements");

  let score = 72;
  score -= issues.length * 11;
  score += Math.min(12, strengths.length * 3);
  score += Math.round((assembly.funScore - 50) / 10);
  // Small visual bonus only — technique already weighted in funScore
  if (hasEmoji && input.techniqueId) score += 2;
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
    funScore: assembly.funScore,
    tier: level.label,
    publishable: score >= 70 && issues.length === 0 && Boolean(input.techniqueId),
  };
}

export function validatePuzzleCandidate(
  input: CandidatePuzzle & { puzzleType?: string; targetDifficulty?: number }
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

  const quality = scorePuzzleQuality({ ...input, targetDifficulty: target });
  if (!quality.publishable) errors.push(...quality.issues);

  if (!isDifficultyInBand(input.difficulty, target)) {
    errors.push(
      `Proposed difficulty ${input.difficulty} outside ${level.label} band ${level.min}-${level.max}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
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

export type { TechniqueId };
