import { NextResponse } from "next/server";
import { generateBlogPost } from "@/ai/services/blog-generator";
import type { NewBlogPost, Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/generate-blog
 *
 * Cron job to generate blog posts for puzzles.
 * Runs at 12pm PST (8pm UTC) daily.
 *
 * This is separate from puzzle generation to allow blog creation
 * after puzzles have been active for some time.
 */
export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get("authorization");
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");

  const isProduction = process.env.NODE_ENV === "production";
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

  // Check Vercel cron secret first (automatically set by Vercel)
  if (vercelCronSecretEnv && vercelCronSecret !== vercelCronSecretEnv) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Fallback to custom CRON_SECRET if Vercel secret not available
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (isProduction) {
    // In production, require at least one authentication method
    if (!vercelCronSecretEnv) {
      return NextResponse.json(
        { success: false, error: "Cron authentication not configured" },
        { status: 500 }
      );
    }
  }

  try {
    logger.info("Starting blog generation cron job");

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

/**
 * Generate blog post for yesterday's puzzle (or any puzzle without a blog)
 */
async function generateBlogForPreviousPuzzle() {
  try {
    const puzzlesCollection = getCollection<Puzzle>("puzzles");
    const blogPostsCollection = getCollection<NewBlogPost>("blogPosts");

    // First try to find yesterday's puzzle
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    logger.info("Looking for puzzle to generate blog for", {
      yesterdayStart: yesterday.toISOString(),
      todayStart: today.toISOString(),
    });

    // Try yesterday's puzzle first
    let puzzle = await puzzlesCollection.findOne({
      publishedAt: {
        $gte: yesterday,
        $lt: today,
      },
    });

    if (!puzzle) {
      logger.warn("No puzzle found for yesterday, looking for any puzzle without a blog post");

      // Find any active puzzle that doesn't have a blog post yet
      const existingBlogPuzzleIds = await blogPostsCollection
        .find({}, { projection: { puzzleId: 1 } })
        .toArray();
      const blogPuzzleIdSet = new Set(existingBlogPuzzleIds.map((b) => b.puzzleId));

      // Get all puzzles and find one without a blog (excluding today's)
      const allPuzzles = await puzzlesCollection
        .find({
          active: true,
          publishedAt: { $lt: today },
        })
        .sort({ publishedAt: -1 })
        .limit(10)
        .toArray();

      puzzle = allPuzzles.find((p) => !blogPuzzleIdSet.has(p.id)) || null;

      if (!puzzle) {
        logger.info("All recent puzzles already have blog posts");
        return { success: true, skipped: "all_puzzles_have_blogs" };
      }
    }

    logger.info("Found puzzle for blog generation", {
      puzzleId: puzzle.id,
      publishedAt: puzzle.publishedAt,
    });

    // Check if blog post already exists for this puzzle
    const existingPost = await blogPostsCollection.findOne({
      puzzleId: puzzle.id,
    });

    if (existingPost) {
      logger.info("Blog post already exists for this puzzle", {
        puzzleId: puzzle.id,
        blogId: existingPost.id,
      });
      return { success: true, skipped: "already_exists", puzzleId: puzzle.id };
    }

    logger.info("Generating blog post for puzzle", { puzzleId: puzzle.id });

    const generatedPost = await generateBlogPost(puzzle);

    const newBlogPost: NewBlogPost = {
      id: crypto.randomUUID(),
      title: generatedPost.title,
      slug: generatedPost.slug,
      content: generatedPost.content,
      excerpt: generatedPost.excerpt,
      authorId: "ai-system",
      puzzleId: puzzle.id,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await blogPostsCollection.insertOne(newBlogPost);

    logger.info("Blog post created successfully", {
      blogId: newBlogPost.id,
      puzzleId: puzzle.id,
      title: newBlogPost.title,
    });

    return {
      success: true,
      postId: newBlogPost.id,
      puzzleId: puzzle.id,
      title: newBlogPost.title,
    };
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
