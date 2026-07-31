import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { generateNextPuzzle } from "@/app/actions/puzzleGenerationActions";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { persistBlogForPuzzle } from "@/lib/blog/persist-puzzle-blog";
import { logger } from "@/lib/logger";

/**
 * Daily Content Generation Workflow
 *
 * Midnight (via cron):
 * 1. Eve generates today's puzzle → Mongo `puzzles`
 * 2. Eve generates blog for yesterday's puzzle → Mongo `blogPosts` (full fields)
 */
function authorizeWorkflow(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

  const vercelOk =
    Boolean(vercelCronSecretEnv) && vercelCronSecret === vercelCronSecretEnv;
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (process.env.NODE_ENV === "production") {
    if (!(vercelCronSecretEnv || cronSecret)) return false;
    return vercelOk || bearerOk;
  }

  if (!(vercelCronSecretEnv || cronSecret)) return true;
  return vercelOk || bearerOk;
}

export async function POST(request: Request) {
  try {
    if (!authorizeWorkflow(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const triggeredBy = body.triggeredBy || "manual";

    logger.info("Starting daily content generation", { triggeredBy });

    logger.info("Generating daily puzzle via Eve");
    const puzzleResult = await generateNextPuzzle();

    if (!puzzleResult.success) {
      const errMsg =
        "error" in puzzleResult && typeof puzzleResult.error === "string"
          ? puzzleResult.error
          : "Unknown error";
      logger.error("Puzzle generation failed", new Error(errMsg));
    }

    logger.info("Revalidating puzzle cache");
    revalidateTag("daily-puzzle", "max");

    logger.info("Generating Eve blog for yesterday's puzzle");
    const blogResult = await generateBlogForYesterday();

    return NextResponse.json({
      success: true,
      puzzle: {
        success: puzzleResult.success,
        cached: "cached" in puzzleResult ? puzzleResult.cached : undefined,
        fallback: "fallback" in puzzleResult ? puzzleResult.fallback : undefined,
        puzzleId:
          puzzleResult.success && puzzleResult.puzzle
            ? (puzzleResult.puzzle as { id?: string }).id
            : undefined,
      },
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

    // Puzzle is already in Mongo from when it was published — blog archives it.
    return await persistBlogForPuzzle(previousPuzzle);
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
