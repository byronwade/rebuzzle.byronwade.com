import { NextResponse } from "next/server";
import { generateBlogPost } from "@/ai/services/blog-generator";
import type { BlogPost, Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * POST /api/admin/blogs/generate-bulk
 * Generate blog posts for multiple puzzles (preview mode - doesn't save to database)
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      mode = "without-blogs",
      puzzleIds,
      startDate,
      endDate,
    }: {
      mode?: "without-blogs" | "date-range" | "puzzle-ids";
      puzzleIds?: string[];
      startDate?: string;
      endDate?: string;
    } = body;

    const puzzlesCollection = getCollection<Puzzle>("puzzles");
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");

    let puzzles: Puzzle[] = [];

    // Get puzzles based on mode
    if (mode === "without-blogs") {
      // Get all puzzles without blog posts
      const allPuzzles = await puzzlesCollection.find({}).toArray();
      const puzzlesWithBlogs = await blogPostsCollection.find({}).toArray();
      const puzzleIdsWithBlogs = new Set(puzzlesWithBlogs.map((bp) => bp.puzzleId));
      puzzles = allPuzzles.filter((p) => !puzzleIdsWithBlogs.has(p.id));
    } else if (mode === "date-range") {
      if (!(startDate && endDate)) {
        return NextResponse.json(
          { error: "startDate and endDate are required for date-range mode" },
          { status: 400 }
        );
      }
      puzzles = await puzzlesCollection
        .find({
          publishedAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
        .toArray();
    } else if (mode === "puzzle-ids") {
      if (!puzzleIds || puzzleIds.length === 0) {
        return NextResponse.json(
          { error: "puzzleIds array is required for puzzle-ids mode" },
          { status: 400 }
        );
      }
      puzzles = await puzzlesCollection.find({ id: { $in: puzzleIds } }).toArray();
    }

    // Limit to 50 for performance
    const limitedPuzzles = puzzles.slice(0, 50);

    console.log(`[Admin] Generating blog posts for ${limitedPuzzles.length} puzzles...`);

    const blogPosts: any[] = [];
    const errors: string[] = [];

    // Generate blog posts sequentially
    for (let i = 0; i < limitedPuzzles.length; i++) {
      const puzzle = limitedPuzzles[i];
      if (!puzzle) continue;
      try {
        const generatedPost = await generateBlogPost(puzzle as any);

        blogPosts.push({
          title: generatedPost.title,
          slug: generatedPost.slug,
          content: generatedPost.content,
          excerpt: generatedPost.excerpt,
          puzzleId: puzzle.id,
          publishedAt: puzzle.publishedAt
            ? new Date(puzzle.publishedAt).toISOString()
            : new Date().toISOString(),
        });
      } catch (error) {
        errors.push(
          `Puzzle ${puzzle.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      blogPosts,
      metadata: {
        requested: limitedPuzzles.length,
        generated: blogPosts.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Admin bulk blog generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate blog posts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
