/**
 * Smart Eve pipeline — invent DAG → diverse slots → judge → polish → revalidate → pick.
 * Used directly (sync) or via durable Workflow steps.
 */

import { AI_CONFIG } from "../../config";
import { isAnswerRegistered } from "../../learning/answer-registry";
import { loadSimCalibration, applySimCalibration } from "../../learning/sim-calibration";
import { buildGenerationBrief } from "../apex/curriculum";
import { critiqueCandidate } from "../apex/critique";
import { applyPlayerSimHeuristics, simulatePlayerSolve } from "../apex/player-sim";
import { candidateNeedsVisualPolish } from "../apex/polish-gates";
import { polishCandidateVisuals } from "../apex/polish-visuals";
import { scoreRubric } from "../apex/rubric";
import { pickWinner } from "../apex/tournament";
import type { ApexCandidate, GenerationBrief } from "../apex/types";
import { isDifficultyInBand } from "../difficulty-levels";
import { isKnownTechniqueId } from "../quality";
import {
  type PuzzleGenerationParams,
  runPuzzleAgentGeneration,
} from "../run-generation";
import type { PuzzleAgentResult } from "../schemas";
import { stableId } from "../tool-impl";
import type { TechniqueId } from "../technique-library";
import { buildInventPlans, type InventPlan } from "./invent-plan";
import { runMultiAgentSolve } from "./multi-solve";
import { revalidateCandidateAfterPolish } from "./revalidate";
import { loadWrongGuessDigest, type WrongGuessDigest } from "./wrong-guesses";

function toCandidate(
  result: PuzzleAgentResult,
  brief: GenerationBrief,
  plan: InventPlan
): ApexCandidate {
  const p = result.puzzle;
  const techniqueId = (
    isKnownTechniqueId(p.techniqueId) ? p.techniqueId : plan.techniqueId
  ) as TechniqueId;

  const inBand = isDifficultyInBand(
    result.metadata.calibratedDifficulty || p.difficulty,
    brief.targetDifficulty
  );

  return {
    id: stableId("eve-wf", String(plan.slot), p.answer, p.rebusPuzzle),
    rebusPuzzle: p.rebusPuzzle,
    answer: p.answer,
    difficulty: p.difficulty,
    difficultyLevel: p.difficultyLevel,
    explanation: p.explanation,
    category: p.category,
    hints: p.hints,
    techniqueId,
    visual: p.visual,
    fingerprint: result.metadata.fingerprint,
    uniquenessScore: result.metadata.uniquenessScore,
    calibratedDifficulty: result.metadata.calibratedDifficulty,
    inBand,
    isUnique: result.metadata.uniquenessScore >= 50,
    solvable: result.metadata.qualityVerdict !== "reject",
    qualityOverall: result.metadata.qualityScore,
    funScore: result.metadata.funScore ?? 0,
    publishable: result.metadata.qualityVerdict !== "reject",
    rejectReasons: [],
  };
}

export async function phaseBuildBrief(
  params: PuzzleGenerationParams
): Promise<GenerationBrief> {
  return buildGenerationBrief({
    targetDifficulty: params.targetDifficulty,
    puzzleType: params.puzzleType,
    theme: params.theme,
    category: params.category,
    requireNovelty: params.requireNovelty,
    qualityThreshold: params.qualityThreshold,
    candidateCount: params.candidateCount ?? AI_CONFIG.puzzleAgent.apex.candidateCount,
    useLearningFeedback: params.useLearningFeedback,
  });
}

export async function phaseLoadWrongGuesses(): Promise<WrongGuessDigest> {
  return loadWrongGuessDigest({ lookbackDays: 14, limit: 12 });
}

export async function phaseBuildInventPlans(input: {
  brief: GenerationBrief;
  wrongGuesses: WrongGuessDigest;
  theme?: string;
  category?: string;
}): Promise<InventPlan[]> {
  return buildInventPlans(input);
}

export async function phaseGenerateSlot(input: {
  params: PuzzleGenerationParams;
  brief: GenerationBrief;
  plan: InventPlan;
}): Promise<ApexCandidate> {
  const { params, brief, plan } = input;
  const phraseSlice = brief.phraseSuggestions
    .filter((_, i) => i % brief.candidateCount === (plan.slot - 1) % brief.candidateCount)
    .map((p) => p.answer);

  const result = await runPuzzleAgentGeneration({
    ...params,
    targetDifficulty: brief.targetDifficulty,
    maxAttempts: Math.min(params.maxAttempts ?? 2, 2),
    qualityThreshold: brief.qualityThreshold,
    briefSummary: [brief.briefSummary, plan.briefNudge].filter(Boolean).join("\n\n"),
    preferredTechniques: [
      plan.techniqueId,
      ...brief.preferredTechniques.filter((t) => t !== plan.techniqueId),
    ],
    avoidTechniques: brief.avoidTechniques,
    phraseSeeds: phraseSlice.length
      ? phraseSlice
      : brief.phraseSuggestions.slice(0, 3).map((p) => p.answer),
    bannedAnswerKeys: brief.diversity.bannedAnswerKeys,
    candidateIndex: plan.slot,
    candidateCount: brief.candidateCount,
    useLearningFeedback: params.useLearningFeedback,
  });

  return toCandidate(result, brief, plan);
}

export async function phaseJudgeCandidate(input: {
  candidate: ApexCandidate;
  brief: GenerationBrief;
  wrongGuesses: WrongGuessDigest;
}): Promise<{
  candidate: ApexCandidate;
  critiqueProvisional: boolean;
  multiSolveOk: boolean;
  multiSolveReasons: string[];
}> {
  const { brief, wrongGuesses } = input;
  let next = { ...input.candidate };
  let critiqueProvisional = false;
  const apex = AI_CONFIG.puzzleAgent.apex;

  if (apex.critiqueEnabled) {
    const pictogramLayers = (next.visual.layers ?? []).filter(
      (layer) => layer.kind === "pictogram"
    );
    const critique = await critiqueCandidate({
      rebusPuzzle: next.rebusPuzzle,
      answer: next.answer,
      explanation: next.explanation,
      hints: next.hints,
      techniqueId: next.techniqueId,
      difficulty: next.difficulty,
      tierLabel: brief.tierLabel,
      unicodeFallback: next.visual.unicodeFallback,
      pictogramConcepts: pictogramLayers.flatMap((l) => (l.concept ? [l.concept] : [])),
      pictogramSvgs: pictogramLayers.flatMap((l) => (l.svg ? [l.svg] : [])),
      iconRecognitionNotes: [
        ...pictogramLayers.map((layer) => {
          if (!layer.svg) return `${layer.concept}: MISSING svg`;
          if (layer.recognitionOk === false) {
            return `${layer.concept}: FAILED (seen ${layer.seenAs ?? "unclear"})`;
          }
          return `${layer.concept}: ok`;
        }),
        wrongGuesses.promptBlock,
      ],
    });

    critiqueProvisional = critique.summary.includes("Critique unavailable");
    next = {
      ...next,
      critique: {
        ...critique,
        creativityScore: critique.creativityScore ?? 60,
        iconRecognizability: critique.iconRecognizability ?? 70,
        overusedTrope: critique.overusedTrope ?? false,
      },
    };

    if (critique.verdict === "reject" || critiqueProvisional) {
      next = {
        ...next,
        publishable: false,
        rejectReasons: [
          ...next.rejectReasons,
          critiqueProvisional
            ? "Critique soft-failed"
            : `Critique reject: ${critique.summary}`,
        ],
      };
    } else if ((critique.iconRecognizability ?? 70) < 55) {
      next = {
        ...next,
        publishable: (critique.iconRecognizability ?? 70) >= 45 ? next.publishable : false,
        rejectReasons: [
          ...next.rejectReasons,
          `Icons unrecognizable (${critique.iconRecognizability})`,
        ],
      };
    }
  }

  if (apex.playerSimEnabled) {
    const rawSim = await simulatePlayerSolve({
      rebusPuzzle: next.rebusPuzzle,
      answer: next.answer,
      explanation: next.explanation,
      hints: next.hints,
      techniqueId: next.techniqueId,
      tierLabel: brief.tierLabel,
      layout: next.visual.layout,
      pictogramConcepts: (next.visual.layers ?? []).flatMap((layer) =>
        layer.kind === "pictogram" && layer.concept ? [layer.concept] : []
      ),
      textLayers: (next.visual.layers ?? []).flatMap((layer) =>
        layer.kind === "text" && layer.content
          ? [`${layer.content}${layer.emphasis ? ` (${layer.emphasis})` : ""}`]
          : []
      ),
    });

    let playerSim = applyPlayerSimHeuristics(rawSim, {
      answer: next.answer,
      hints: next.hints,
      tierLabel: brief.tierLabel,
    });

    try {
      const cal = await loadSimCalibration();
      if (cal.sampleSize >= 6 && Math.abs(cal.adjustment) >= 0.02) {
        playerSim = {
          ...playerSim,
          estimatedSolveRate: applySimCalibration(playerSim.estimatedSolveRate, cal),
        };
      }
    } catch {
      // ignore
    }

    // Inject live wrong guesses into unfairness when they match tempting parses
    const liveTraps = wrongGuesses.topGuesses
      .slice(0, 5)
      .map((g) => g.guess.toLowerCase());
    const overlap = (playerSim.firstWrongParses ?? []).filter((p) =>
      liveTraps.some((t) => p.toLowerCase().includes(t) || t.includes(p.toLowerCase()))
    );
    if (overlap.length) {
      playerSim = {
        ...playerSim,
        unfairReasons: [
          ...playerSim.unfairReasons,
          `Live players already guess: ${overlap.slice(0, 2).join(", ")}`,
        ],
      };
    }

    next = { ...next, playerSim };
  }

  const multi = await runMultiAgentSolve({
    rebusPuzzle: next.visual.unicodeFallback || next.rebusPuzzle,
    answer: next.answer,
    hints: next.hints,
    layout: next.visual.layout,
    pictogramConcepts: (next.visual.layers ?? []).flatMap((layer) =>
      layer.kind === "pictogram" && layer.concept ? [layer.concept] : []
    ),
  });

  if (next.playerSim) {
    next = {
      ...next,
      playerSim: {
        ...next.playerSim,
        estimatedSolveRate:
          (next.playerSim.estimatedSolveRate + multi.estimatedSolveRate) / 2,
      },
    };
  }

  next = { ...next, rubric: scoreRubric(next) };

  return {
    candidate: next,
    critiqueProvisional,
    multiSolveOk: multi.ok,
    multiSolveReasons: multi.reasons,
  };
}

export async function phasePolishAndRevalidate(input: {
  candidate: ApexCandidate;
  brief: GenerationBrief;
  critiqueProvisional: boolean;
  multiSolveOk: boolean;
  multiSolveReasons: string[];
}): Promise<ApexCandidate> {
  let next = input.candidate;
  if (candidateNeedsVisualPolish(next)) {
    const notes = next.critique?.reviseInstructions ?? [];
    next = await polishCandidateVisuals(next, notes);
    next = { ...next, rubric: scoreRubric(next) };
  }

  const revalidated = revalidateCandidateAfterPolish(
    next,
    input.brief.targetDifficulty,
    {
      multiSolveOk: input.multiSolveOk,
      multiSolveReasons: input.multiSolveReasons,
      critiqueProvisional: input.critiqueProvisional,
      requireHardRubric: true,
      minRubricOverall: input.brief.minRubricOverall,
    }
  );

  return revalidated.candidate;
}

export async function phaseSelectWinner(input: {
  candidates: ApexCandidate[];
  brief: GenerationBrief;
  failures: string[];
  started: number;
  phases: { briefMs: number; generateMs: number; critiqueMs: number };
}): Promise<PuzzleAgentResult> {
  const { brief, failures, started, phases } = input;
  const { winner, ranked } = pickWinner(input.candidates, brief.minRubricOverall);

  // Hard floor — no soft under-threshold publish for daily workflow
  if (!winner) {
    throw new Error(
      `Eve workflow found no publishable winner (hard rubric floor ${brief.minRubricOverall}). Failures: ${failures.slice(0, 3).join(" | ") || "gates/rubric/multi-solve"}`
    );
  }

  let chosen = winner;
  const archiveHit = await isAnswerRegistered(chosen.answer);
  if (archiveHit.taken) {
    const alternate = ranked.find(
      (c) =>
        c.id !== chosen.id &&
        (c.tournamentScore ?? -1) >= 0 &&
        c.publishable
    );
    if (!alternate) {
      throw new Error(
        `Winner answer already archived (${archiveHit.puzzleId}). No alternate.`
      );
    }
    const altHit = await isAnswerRegistered(alternate.answer);
    if (altHit.taken) {
      throw new Error("Candidates collided with archive — regenerate required");
    }
    chosen = alternate;
  }

  const selectMs = Date.now() - started - phases.briefMs - phases.generateMs - phases.critiqueMs;
  const runnersUp = ranked.filter((c) => c.id !== chosen.id).slice(0, 3);

  return {
    puzzle: {
      rebusPuzzle: chosen.rebusPuzzle,
      answer: chosen.answer,
      difficulty: chosen.difficulty,
      difficultyLevel: chosen.difficultyLevel,
      explanation: chosen.explanation,
      category: chosen.category,
      hints: chosen.hints,
      techniqueId: chosen.techniqueId,
      visual: chosen.visual,
    },
    metadata: {
      fingerprint: chosen.fingerprint,
      uniquenessScore: chosen.uniquenessScore,
      calibratedDifficulty: chosen.calibratedDifficulty,
      difficultyLevel: chosen.difficultyLevel,
      qualityScore: Math.max(chosen.qualityOverall, chosen.rubric?.overall ?? 0),
      qualityVerdict:
        (chosen.rubric?.overall ?? 0) >= 88
          ? "excellent"
          : (chosen.rubric?.overall ?? 0) >= 78
            ? "good"
            : "acceptable",
      funScore: chosen.funScore,
      generationAttempts: ranked.length,
      thinkingSummary: [
        `Eve durable workflow (${brief.tierLabel})`,
        `rubric ${chosen.rubric?.overall ?? "?"}/100`,
        `technique ${chosen.techniqueId}`,
        `candidates ${ranked.length}`,
        failures.length ? `slot failures ${failures.length}` : null,
        `${Date.now() - started}ms`,
      ]
        .filter(Boolean)
        .join(" · "),
      visualStyleId: chosen.visual.styleId,
      estimatedSolveRate: chosen.playerSim?.estimatedSolveRate,
    },
    status: "success",
    recommendations: [
      ...(chosen.critique?.reviseInstructions ?? []).slice(0, 2),
      ...runnersUp.map(
        (r) =>
          `Runner-up: ${r.answer} (${r.techniqueId}, rubric ${r.rubric?.overall ?? "?"})`
      ),
      `selectMs≈${Math.max(0, selectMs)}`,
    ].filter(Boolean),
  };
}

/**
 * Full smart pipeline (non-durable). Workflow steps call the same phases.
 */
export async function runSmartEvePipeline(
  params: PuzzleGenerationParams
): Promise<PuzzleAgentResult> {
  const started = Date.now();
  const briefStarted = Date.now();
  const brief = await phaseBuildBrief(params);
  const wrongGuesses = await phaseLoadWrongGuesses();
  const plans = await phaseBuildInventPlans({
    brief,
    wrongGuesses,
    theme: params.theme,
    category: params.category,
  });
  const briefMs = Date.now() - briefStarted;

  const generateStarted = Date.now();
  const failures: string[] = [];
  const rawCandidates: ApexCandidate[] = [];

  for (const plan of plans) {
    try {
      rawCandidates.push(await phaseGenerateSlot({ params, brief, plan }));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  const generateMs = Date.now() - generateStarted;

  if (!rawCandidates.length) {
    throw new Error(
      `Eve smart pipeline produced no candidates. ${failures.slice(0, 3).join(" | ")}`
    );
  }

  const critiqueStarted = Date.now();
  const judged = await Promise.all(
    rawCandidates.map(async (candidate) => {
      const j = await phaseJudgeCandidate({ candidate, brief, wrongGuesses });
      return phasePolishAndRevalidate({
        candidate: j.candidate,
        brief,
        critiqueProvisional: j.critiqueProvisional,
        multiSolveOk: j.multiSolveOk,
        multiSolveReasons: j.multiSolveReasons,
      });
    })
  );
  const critiqueMs = Date.now() - critiqueStarted;

  return phaseSelectWinner({
    candidates: judged,
    brief,
    failures,
    started,
    phases: { briefMs, generateMs, critiqueMs },
  });
}
