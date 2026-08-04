/**
 * Deterministic grading for Studio submissions.
 *
 * Reuses visual publish checks (catalog authenticity, no answer leak) without
 * Apex invent spend or blind recognition evidence.
 */

import { isAnswerRegistered, normalizeAnswerKey } from "@/ai/learning/answer-registry";
import {
  computeFunScore,
  displayLeaksAnswer,
  evaluateVisualForPublish,
  explanationMapsAnswer,
  hintLeaksAnswerEarly,
  isKnownTechniqueId,
  isTechniqueAllowedForTarget,
} from "@/ai/puzzle-agent/quality";
import type { PuzzleVisual } from "@/ai/puzzle-agent/visual/composition";
import { countVisualParts } from "@/ai/puzzle-agent/visual/composition";
import { hydrateStudioVisual } from "./visual-hydrate";

export type GradeSubmissionInput = {
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  visual: {
    layout?: PuzzleVisual["layout"];
    layers: PuzzleVisual["layers"];
    caption?: string;
  };
};

export type GradeSubmissionResult = {
  ok: boolean;
  visual: PuzzleVisual;
  rebusPuzzle: string;
  answerKey: string;
  score: number;
  funScore: number;
  issues: string[];
};

export async function gradeUserPuzzleSubmission(
  input: GradeSubmissionInput
): Promise<GradeSubmissionResult> {
  const issues: string[] = [];
  const answer = input.answer.trim();
  const explanation = input.explanation.trim();
  const hints = input.hints.map((h) => h.trim()).filter(Boolean);
  const techniqueId = input.techniqueId.trim();
  const difficulty = Math.max(1, Math.min(10, Math.round(input.difficulty)));

  const hydrated = hydrateStudioVisual(input.visual);
  issues.push(...hydrated.issues);
  const visual = hydrated.visual;
  const rebusPuzzle = visual.unicodeFallback;

  if (!answer) issues.push("Answer is required");
  if (answer.length > 80) issues.push("Answer is too long");
  if (!explanation || explanation.length < 24) {
    issues.push("Explanation must be at least 24 characters and map the board to the answer");
  } else if (!explanationMapsAnswer(explanation, answer)) {
    issues.push("Explanation should mention how the board maps to the answer");
  }
  if (hints.length < 3) issues.push("Provide at least 3 progressive hints");
  else issues.push(...hintLeaksAnswerEarly(hints, answer));

  if (!isKnownTechniqueId(techniqueId)) {
    issues.push("Pick a known rebus technique");
  } else if (!isTechniqueAllowedForTarget(techniqueId, difficulty)) {
    issues.push(`Technique ${techniqueId} is not allowed for difficulty ${difficulty}`);
  }

  if (displayLeaksAnswer(rebusPuzzle, answer)) {
    issues.push("Answer is visible in the board text — hide the solution in the visual");
  }

  if (visual.layers.some((layer) => layer.kind === "image")) {
    issues.push("Custom image tiles are not supported in Studio yet — use catalog pictograms");
  }

  const parts = countVisualParts(visual);
  if (parts < 1) issues.push("Add at least one pictogram or text cue");
  if (parts > 6) issues.push("Too many cues — keep the board readable (max 6 parts)");

  const visualCheck = evaluateVisualForPublish(visual, {
    requireCatalogRecognitionEvidence: false,
  });
  if (!visualCheck.ok) {
    issues.push(visualCheck.reason ?? "Visual failed publish check");
  }

  const answerKey = normalizeAnswerKey(answer);
  try {
    const taken = await isAnswerRegistered(answer);
    if (taken.taken) {
      issues.push("That answer is already in the puzzle archive — pick a fresh phrase");
    }
  } catch {
    issues.push("Could not verify answer uniqueness — try again");
  }

  const styledText = visual.layers.some(
    (layer) =>
      layer.kind === "text" &&
      layer.emphasis &&
      ["large", "small", "strike", "stacked", "tiny"].includes(layer.emphasis)
  );
  const hasOperator = visual.layers.some((layer) => layer.kind === "operator");

  const funScore = computeFunScore({
    techniqueId,
    knownTechnique: isKnownTechniqueId(techniqueId),
    withinBudget: parts >= 1 && parts <= 6,
    issueCount: issues.length,
    generativeParts: visualCheck.pictogramSvgCount + (styledText ? 1 : 0),
    unicodeParts: 0,
    hasSpatialOrOperator: hasOperator || visual.layout !== "row",
    hasStyledText: styledText,
    explanationMapsWell: explanationMapsAnswer(explanation, answer),
  });

  let score = 72;
  score -= issues.length * 12;
  score += Math.round((funScore - 55) / 8);
  if (visualCheck.ok && isKnownTechniqueId(techniqueId)) score += 8;
  score = Math.max(0, Math.min(100, score));

  if (score < 70) issues.push(`Quality score ${score}/100 is below the Studio publish floor (70)`);
  if (funScore < 60) issues.push(`Fun score ${funScore}/100 is below the Studio floor (60)`);

  const uniqueIssues = [...new Set(issues)];
  return {
    ok: uniqueIssues.length === 0,
    visual,
    rebusPuzzle,
    answerKey,
    score,
    funScore,
    issues: uniqueIssues,
  };
}
