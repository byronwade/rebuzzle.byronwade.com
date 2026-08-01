/**
 * Start (and optionally await) the durable Eve puzzle generation workflow.
 */

import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { AI_CONFIG } from "@/ai/config";
import { runSmartEvePipeline } from "@/ai/puzzle-agent/workflow";
import { generateEvePuzzleWorkflow } from "@/workflows/eve-puzzle-generation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetDifficulty =
      typeof body.targetDifficulty === "number"
        ? body.targetDifficulty
        : AI_CONFIG.puzzleAgent.defaultTargetDifficulty;
    const awaitResult = body.await !== false;

    const params = {
      targetDifficulty,
      puzzleType: typeof body.puzzleType === "string" ? body.puzzleType : "rebus",
      theme: typeof body.theme === "string" ? body.theme : undefined,
      category: typeof body.category === "string" ? body.category : undefined,
      requireNovelty: body.requireNovelty !== false,
      qualityThreshold:
        typeof body.qualityThreshold === "number"
          ? body.qualityThreshold
          : AI_CONFIG.puzzleAgent.qualityThreshold,
      maxAttempts: typeof body.maxAttempts === "number" ? body.maxAttempts : 2,
      candidateCount:
        typeof body.candidateCount === "number"
          ? body.candidateCount
          : AI_CONFIG.puzzleAgent.apex.candidateCount,
      useLearningFeedback: body.useLearningFeedback !== false,
      requestId: typeof body.requestId === "string" ? body.requestId : undefined,
    };

    if (!AI_CONFIG.puzzleAgent.workflow.enabled || AI_CONFIG.puzzleAgent.workflow.syncOnly) {
      const puzzle = await runSmartEvePipeline(params);
      return NextResponse.json({
        mode: "sync",
        puzzle,
      });
    }

    const run = await start(generateEvePuzzleWorkflow, [params]);

    if (!awaitResult) {
      return NextResponse.json({
        mode: "workflow",
        runId: run.runId,
        status: "started",
      });
    }

    const puzzle = await run.returnValue;
    return NextResponse.json({
      mode: "workflow",
      runId: run.runId,
      puzzle,
    });
  } catch (error) {
    console.error("[eve-workflow]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Eve workflow failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ai/eve-workflow",
    description: "Durable Eve invent→compose→judge puzzle generation",
    defaults: {
      targetDifficulty: AI_CONFIG.puzzleAgent.defaultTargetDifficulty,
      workflowEnabled: AI_CONFIG.puzzleAgent.workflow.enabled,
      syncOnly: AI_CONFIG.puzzleAgent.workflow.syncOnly,
    },
  });
}
