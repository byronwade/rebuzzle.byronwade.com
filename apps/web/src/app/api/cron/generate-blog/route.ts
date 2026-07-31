import { NextResponse } from "next/server";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { persistBlogForPuzzle } from "@/lib/blog/persist-puzzle-blog";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/generate-blog
 *
 * Cron (~20:00 UTC): Eve writes the archive blog for yesterday's puzzle
 * (full sections + SEO) into MongoDB. Backfills recent puzzles if needed.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");

  const isProduction = process.env.NODE_ENV === "production";
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

  const vercelOk =
    Boolean(vercelCronSecretEnv) && vercelCronSecret === vercelCronSecretEnv;
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (isProduction) {
    if (!(vercelCronSecretEnv || cronSecret)) {
      return NextResponse.json(
        { success: false, error: "Cron authentication not configured" },
        { status: 500 }
      );
    }
    if (!(vercelOk || bearerOk)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if ((vercelCronSecretEnv || cronSecret) && !(vercelOk || bearerOk)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting Eve blog generation cron");
    const result = await generateBlogForPreviousPuzzle();
    logger.info("Blog generation cron completed", { result });

    return NextResponse.json({
      success: true,
      message: "Blog generation completed",
      result,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Blog generation cron failed",
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        success: false,
        error: "Blog generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function generateBlogForPreviousPuzzle() {
  try {
    const puzzlesCollection = getCollection<Puzzle>("puzzles");

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    logger.info("Looking for puzzle to generate blog for", {
      yesterdayStart: yesterday.toISOString(),
      todayStart: today.toISOString(),
    });

    let puzzle = await puzzlesCollection.findOne({
      publishedAt: {
        $gte: yesterday,
        $lt: today,
      },
    });

    if (!puzzle) {
      logger.warn("No puzzle for yesterday — backfilling recent puzzle without a blog");

      const recent = await puzzlesCollection
        .find({
          active: true,
          publishedAt: { $lt: today },
        })
        .sort({ publishedAt: -1 })
        .limit(15)
        .toArray();

      for (const candidate of recent) {
        const result = await persistBlogForPuzzle(candidate);
        if (result.success && !("skipped" in result && result.skipped === "already_exists")) {
          return result;
        }
        if (result.success && "skipped" in result) {
          continue;
        }
      }

      return { success: true, skipped: "all_puzzles_have_blogs" };
    }

    return await persistBlogForPuzzle(puzzle);
  } catch (error) {
    logger.error(
      "Error in generateBlogForPreviousPuzzle",
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
