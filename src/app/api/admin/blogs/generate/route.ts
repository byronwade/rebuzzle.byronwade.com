import { NextResponse } from "next/server";
import { generateBlogPost } from "@/ai/services/blog-generator";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * POST /api/admin/blogs/generate
 * Generate a blog post for a puzzle (preview mode - doesn't save to database)
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { puzzleId }: { puzzleId: string } = body;

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      );
    }

    // Find the puzzle
    const puzzlesCollection = getCollection<Puzzle>("puzzles");
    const puzzle = await puzzlesCollection.findOne({ id: puzzleId });

    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    console.log(`[Admin] Generating blog post for puzzle: ${puzzleId}`);

    // Generate blog post
    const generatedPost = await generateBlogPost(puzzle);

    // Format for preview (don't save to database)
    const blogPreview = {
      title: generatedPost.title,
      slug: generatedPost.slug,
      content: generatedPost.content,
      excerpt: generatedPost.excerpt,
      puzzleId,
      publishedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      blogPost: blogPreview,
    });
  } catch (error) {
    console.error("Admin blog generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate blog post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

