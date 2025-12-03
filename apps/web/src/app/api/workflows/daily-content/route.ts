import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateBlogPost } from "@/ai/services/blog-generator";
import { generateNextPuzzle } from "@/app/actions/puzzleGenerationActions";
import type { NewBlogPost, Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";

/**
 * Daily Content Generation Workflow
 *
 * Runs daily at midnight (via cron job) to:
 * 1. Generate today's puzzle
 * 2. Generate blog post for yesterday's puzzle
 *
 * Native implementation - no workflow library needed
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const triggeredBy = body.triggeredBy || "manual";

    logger.info("Starting daily content generation", { triggeredBy });

    // Step 1: Generate today's puzzle
    logger.info("Generating daily puzzle");
    const puzzleResult = await generateNextPuzzle();

    if (!puzzleResult.success) {
      logger.error(
        "Puzzle generation failed",
        new Error((puzzleResult as any).error || "Unknown error")
      );
    }

    // Step 1.5: Revalidate puzzle cache to ensure all users see the new puzzle
    logger.info("Revalidating puzzle cache");
    revalidateTag("daily-puzzle", "max");
    logger.info("Puzzle cache revalidated successfully");

    // Step 2: Generate blog post for yesterday's puzzle
    logger.info("Generating blog post for previous puzzle");
    const blogResult = await generateBlogForYesterday();

    return NextResponse.json({
      success: true,
      puzzle: puzzleResult,
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

/**
 * Generate blog post for yesterday's puzzle
 */
async function generateBlogForYesterday() {
  try {
    const puzzlesCollection = getCollection<Puzzle>("puzzles");
    const blogPostsCollection = getCollection<NewBlogPost>("blogPosts");

    // Find the puzzle that was active YESTERDAY
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const previousPuzzle = await puzzlesCollection.findOne({
      publishedAt: {
        $gte: yesterday,
        $lt: today,
      },
    });

    if (!previousPuzzle) {
      return { success: false, error: "no_puzzle_found" };
    }

    // Check if blog post already exists
    const existingPost = await blogPostsCollection.findOne({
      puzzleId: previousPuzzle.id,
    });

    if (existingPost) {
      return { success: true, skipped: "already_exists" };
    }

    logger.info("Generating blog post", { puzzleId: previousPuzzle.id });

    const generatedPost = await generateBlogPost(previousPuzzle);

    const newBlogPost: NewBlogPost = {
      id: crypto.randomUUID(),
      title: generatedPost.title,
      slug: generatedPost.slug,
      content: generatedPost.content,
      excerpt: generatedPost.excerpt,
      authorId: "ai-system",
      puzzleId: previousPuzzle.id,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await blogPostsCollection.insertOne(newBlogPost);

    return {
      success: true,
      postId: newBlogPost.id,
      title: newBlogPost.title,
    };
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
