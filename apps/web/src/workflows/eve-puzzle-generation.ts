/**
 * Durable Eve puzzle generation workflow (Vercel Workflow DevKit).
 *
 * Each phase is a `"use step"` so it retries independently and survives crashes.
 * Business logic lives in puzzle-agent/workflow/* — this file only orchestrates.
 */

import type { PuzzleGenerationParams } from "@/ai/puzzle-agent/run-generation";
import type { PuzzleAgentResult } from "@/ai/puzzle-agent/schemas";
import type { ApexCandidate, GenerationBrief } from "@/ai/puzzle-agent/apex/types";
import type { InventPlan } from "@/ai/puzzle-agent/workflow/invent-plan";
import type { WrongGuessDigest } from "@/ai/puzzle-agent/workflow/wrong-guesses";
import {
  phaseBuildBrief,
  phaseBuildInventPlans,
  phaseGenerateSlot,
  phaseJudgeCandidate,
  phaseLoadWrongGuesses,
  phasePolishAndRevalidate,
  phaseSelectWinner,
} from "@/ai/puzzle-agent/workflow/smart-pipeline";
import { FatalError } from "workflow";

export type EveWorkflowParams = PuzzleGenerationParams & {
  /** Optional correlation id for logs */
  requestId?: string;
};

async function stepBuildBrief(params: EveWorkflowParams): Promise<GenerationBrief> {
  "use step";
  return phaseBuildBrief(params);
}

async function stepLoadWrongGuesses(): Promise<WrongGuessDigest> {
  "use step";
  return phaseLoadWrongGuesses();
}

async function stepBuildInventPlans(input: {
  brief: GenerationBrief;
  wrongGuesses: WrongGuessDigest;
  theme?: string;
  category?: string;
}): Promise<InventPlan[]> {
  "use step";
  return phaseBuildInventPlans(input);
}

async function stepGenerateSlot(input: {
  params: EveWorkflowParams;
  brief: GenerationBrief;
  plan: InventPlan;
}): Promise<ApexCandidate> {
  "use step";
  return phaseGenerateSlot(input);
}

async function stepJudgeCandidate(input: {
  candidate: ApexCandidate;
  brief: GenerationBrief;
  wrongGuesses: WrongGuessDigest;
}): Promise<{
  candidate: ApexCandidate;
  critiqueProvisional: boolean;
  multiSolveOk: boolean;
  multiSolveReasons: string[];
}> {
  "use step";
  return phaseJudgeCandidate(input);
}

async function stepPolishAndRevalidate(input: {
  candidate: ApexCandidate;
  brief: GenerationBrief;
  critiqueProvisional: boolean;
  multiSolveOk: boolean;
  multiSolveReasons: string[];
}): Promise<ApexCandidate> {
  "use step";
  return phasePolishAndRevalidate(input);
}

async function stepSelectWinner(input: {
  candidates: ApexCandidate[];
  brief: GenerationBrief;
  failures: string[];
  started: number;
  phases: { briefMs: number; generateMs: number; critiqueMs: number };
}): Promise<PuzzleAgentResult> {
  "use step";
  return phaseSelectWinner(input);
}

/**
 * Durable invent → compose → judge → polish → revalidate → tournament.
 */
export async function generateEvePuzzleWorkflow(
  params: EveWorkflowParams
): Promise<PuzzleAgentResult> {
  "use workflow";

  const brief = await stepBuildBrief(params);
  const wrongGuesses = await stepLoadWrongGuesses();
  const plans = await stepBuildInventPlans({
    brief,
    wrongGuesses,
    theme: params.theme,
    category: params.category,
  });

  if (!plans.length) {
    throw new FatalError("Eve workflow: invent plan builder returned no slots");
  }

  const failures: string[] = [];
  const judgedCandidates: ApexCandidate[] = [];

  // Sequential slots — durable + quota-safe; each slot is its own retry boundary
  for (const plan of plans) {
    try {
      const raw = await stepGenerateSlot({ params, brief, plan });
      const judged = await stepJudgeCandidate({
        candidate: raw,
        brief,
        wrongGuesses,
      });
      const validated = await stepPolishAndRevalidate({
        candidate: judged.candidate,
        brief,
        critiqueProvisional: judged.critiqueProvisional,
        multiSolveOk: judged.multiSolveOk,
        multiSolveReasons: judged.multiSolveReasons,
      });
      judgedCandidates.push(validated);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (!judgedCandidates.length) {
    throw new FatalError(
      `Eve workflow: all slots failed. ${failures.slice(0, 3).join(" | ") || "unknown"}`
    );
  }

  // Timings are best-effort metadata (computed inside the step, not workflow sandbox)
  return stepSelectWinner({
    candidates: judgedCandidates,
    brief,
    failures,
    started: 0,
    phases: { briefMs: 0, generateMs: 0, critiqueMs: 0 },
  });
}
