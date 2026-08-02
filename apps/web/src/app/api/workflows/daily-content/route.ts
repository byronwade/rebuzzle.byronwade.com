import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isHardAIBudgetError, parseAIError } from "@/ai/errors";
import { generateNextPuzzle, getTodaysPuzzle } from "@/app/actions/puzzleGenerationActions";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { proposeBlogForPuzzle } from "@/lib/blog/propose-puzzle-blog";
import { logger } from "@/lib/logger";

/**
 * Daily Content Generation Workflow
 *
 * Midnight (via cron):
 * 1. Eve generates today's puzzle → Mongo `puzzles`
 * 2. Eve pre-generates tomorrow's puzzle → blind playtest queue
 * 3. Eve generates yesterday's blog → draft GitHub pull request
 */
function authorizeWorkflow(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

  const vercelOk = Boolean(vercelCronSecretEnv) && vercelCronSecret === vercelCronSecretEnv;
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (process.env.NODE_ENV === "production") {
    if (!(vercelCronSecretEnv || cronSecret)) return false;
    return vercelOk || bearerOk;
  }

  if (!(vercelCronSecretEnv || cronSecret)) return true;
  return vercelOk || bearerOk;
}

export function nextUtcDateKey(now = new Date()): string {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    if (!authorizeWorkflow(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const triggeredBy = body.triggeredBy || "manual";

    logger.info("Starting daily content generation", { triggeredBy });

    // Self-learning calibration before generation — adapt difficulty from recent play
    let learning: {
      target?: number;
      baseline?: number;
      delta?: number;
      reason?: string;
      eventId?: string;
    } = {};
    try {
      const { runLearningCalibration } = await import("@/ai/learning");
      const policy = await runLearningCalibration();
      learning = {
        target: policy.adaptive.target,
        baseline: policy.adaptive.baseline,
        delta: policy.adaptive.delta,
        reason: policy.adaptive.reason,
        eventId: policy.eventId,
      };
      logger.info("Self-learning calibration applied", learning);
    } catch (learnError) {
      logger.warn("Self-learning calibration skipped", {
        error: learnError instanceof Error ? learnError.message : String(learnError),
      });
    }

    logger.info("Generating daily puzzle via Apex/Eve");
    const puzzleResult = await generateNextPuzzle();
    let aiBudgetExhausted = false;

    if (!puzzleResult.success) {
      const errMsg =
        "error" in puzzleResult && typeof puzzleResult.error === "string"
          ? puzzleResult.error
          : "Unknown error";
      const parsed = parseAIError(new Error(errMsg));
      aiBudgetExhausted = isHardAIBudgetError(parsed);
      logger.error("Puzzle generation failed", parsed);
    }

    const nextDate = nextUtcDateKey();
    let nextPuzzle: {
      success: boolean;
      date: string;
      cached?: boolean;
      fallback?: boolean;
      aiGenerated?: boolean;
      puzzleId?: string;
      error?: string;
      errorCode?: string;
      skipped?: string;
    };
    if (aiBudgetExhausted) {
      nextPuzzle = {
        success: false,
        date: nextDate,
        error: "AI Gateway budget exhausted",
        errorCode: "AI_BUDGET_EXCEEDED",
        skipped: "ai_budget_exceeded",
      };
    } else {
      try {
        logger.info("Pre-generating next-day puzzle for blind playtesting", { nextDate });
        const result = await getTodaysPuzzle("rebus", nextDate, {
          allowAiGenerate: true,
          failOnAiError: true,
        });
        nextPuzzle = {
          success: result.success,
          date: nextDate,
          cached: "cached" in result ? result.cached : undefined,
          fallback: "fallback" in result ? result.fallback : undefined,
          aiGenerated: "aiGenerated" in result ? result.aiGenerated : undefined,
          puzzleId:
            result.success && result.puzzle ? (result.puzzle as { id?: string }).id : undefined,
          error:
            !result.success && "error" in result && typeof result.error === "string"
              ? result.error
              : undefined,
        };
      } catch (error) {
        const parsed = parseAIError(error);
        aiBudgetExhausted = isHardAIBudgetError(parsed);
        nextPuzzle = {
          success: false,
          date: nextDate,
          error: parsed.message || "Next-day generation failed",
          errorCode: aiBudgetExhausted ? parsed.code : undefined,
        };
        logger.error("Next-day puzzle pre-generation failed", parsed, { nextDate });
      }
    }

    logger.info("Revalidating puzzle cache");
    revalidateTag("daily-puzzle", "max");

    let blogResult;
    if (aiBudgetExhausted) {
      blogResult = {
        success: false,
        skipped: "ai_budget_exceeded",
        error: "AI Gateway budget exhausted",
      };
    } else {
      logger.info("Generating Eve blog for yesterday's puzzle");
      blogResult = await generateBlogForYesterday();
    }

    return NextResponse.json({
      success: true,
      learning,
      puzzle: {
        success: puzzleResult.success,
        cached: "cached" in puzzleResult ? puzzleResult.cached : undefined,
        fallback: "fallback" in puzzleResult ? puzzleResult.fallback : undefined,
        puzzleId:
          puzzleResult.success && puzzleResult.puzzle
            ? (puzzleResult.puzzle as { id?: string }).id
            : undefined,
      },
      nextPuzzle,
      blog: blogResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Daily content workflow failed",
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function generateBlogForYesterday() {
  try {
    const puzzlesCollection = getCollection<Puzzle>("puzzles");

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${todayKey}T00:00:00.000Z`);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

    const previousPuzzle = await puzzlesCollection.findOne({
      publishedAt: {
        $gte: yesterdayStart,
        $lt: todayStart,
      },
    });

    if (!previousPuzzle) {
      return { success: false, error: "no_puzzle_found" };
    }

    return await proposeBlogForPuzzle(previousPuzzle);
  } catch (error) {
    logger.error(
      "Blog generation failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
