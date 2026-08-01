/**
 * Multi-dimensional tournament rubric (deterministic + critique/sim signals).
 */

import { evaluateVisualForPublish, isKnownTechniqueId } from "../quality";
import { scorePictogramClarity } from "../visual/pictogram-clarity";
import type { ApexCandidate, RubricScores } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Score a candidate across aha, fairness, novelty, craft, shareability, technique, hints.
 */
export function scoreRubric(candidate: ApexCandidate): RubricScores {
  const visual = evaluateVisualForPublish(candidate.visual);
  const critique = candidate.critique;
  const sim = candidate.playerSim;

  const ahaMoment = clamp(
    (critique?.ahaPredicted ?? 60) * 0.7 +
      (candidate.funScore ?? 50) * 0.3 +
      (critique?.verdict === "ship" ? 8 : 0)
  );

  let fairness = 70;
  if (sim) {
    fairness = sim.hintUnlockOrderLooksFair ? 78 : 45;
    fairness += Math.round((sim.estimatedSolveRate - 0.35) * 40);
    fairness -= (sim.unfairReasons?.length ?? 0) * 10;
  }
  if (!candidate.solvable) fairness -= 25;
  if (!candidate.inBand) fairness -= 15;
  fairness = clamp(fairness);

  let novelty = candidate.uniquenessScore || (candidate.isUnique ? 72 : 30);
  if (candidate.isUnique) novelty = Math.max(novelty, 70);
  else novelty = Math.min(novelty, 40);
  novelty = clamp(novelty);

  let visualCraft = visual.ok ? 68 : 35;
  visualCraft += Math.min(14, visual.pictogramSvgCount * 6);
  visualCraft += Math.min(10, visual.textLayerCount * 4);
  if (candidate.visual.mode === "composed" || candidate.visual.mode === "hybrid") {
    visualCraft += 6;
  }
  if (candidate.visual.mode === "unicode") visualCraft -= 30;

  const pictogramClarities = (candidate.visual.layers ?? [])
    .filter((l) => l.kind === "pictogram" && l.svg)
    .map((l) => scorePictogramClarity(l.svg).score);
  if (pictogramClarities.length) {
    const avg =
      pictogramClarities.reduce((a, b) => a + b, 0) / pictogramClarities.length;
    if (avg >= 72) visualCraft += 14;
    else if (avg >= 58) visualCraft += 6;
    else visualCraft -= 28;
  }

  visualCraft = clamp(visualCraft);

  // Shareability: short punchy answer + clean fallback
  const answerWords = candidate.answer.trim().split(/\s+/).length;
  let shareability = 68;
  if (answerWords <= 4) shareability += 10;
  if (answerWords > 6) shareability -= 15;
  if ((candidate.rebusPuzzle || "").length <= 40) shareability += 8;
  if (critique?.verdict === "ship") shareability += 6;
  shareability = clamp(shareability);

  let techniqueFit = isKnownTechniqueId(candidate.techniqueId) ? 75 : 20;
  if (critique) {
    techniqueFit = clamp(techniqueFit * 0.6 + (critique.falseLeadQuality ?? 50) * 0.4);
  }

  let hintCraft = Math.min(90, 50 + candidate.hints.length * 8);
  if (sim && !sim.hintUnlockOrderLooksFair) hintCraft -= 25;
  if (critique?.flaws.some((f) => /hint/i.test(f))) hintCraft -= 12;
  hintCraft = clamp(hintCraft);

  const overall = clamp(
    ahaMoment * 0.22 +
      fairness * 0.18 +
      novelty * 0.14 +
      visualCraft * 0.16 +
      shareability * 0.1 +
      techniqueFit * 0.12 +
      hintCraft * 0.08
  );

  return {
    ahaMoment,
    fairness,
    novelty,
    visualCraft,
    shareability,
    techniqueFit,
    hintCraft,
    overall,
  };
}

/**
 * Tournament score blends rubric with hard gate pass/fail.
 */
export function tournamentScore(candidate: ApexCandidate, minRubric: number): number {
  if (!candidate.publishable || !candidate.isUnique || !candidate.solvable || !candidate.inBand) {
    return -1;
  }
  if (candidate.critique?.verdict === "reject") return -1;
  const rubric = candidate.rubric?.overall ?? 0;
  if (rubric < minRubric) return rubric - 100;

  let score = rubric;
  if (candidate.critique?.verdict === "ship") score += 6;
  if (candidate.playerSim?.hintUnlockOrderLooksFair) score += 3;
  if ((candidate.playerSim?.estimatedSolveRate ?? 0) > 0.2) score += 2;
  score += Math.min(5, (candidate.funScore - 65) / 5);
  return score;
}
