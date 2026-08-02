import { NextResponse } from "next/server";
import { z } from "zod";
import type { GeneratedBlogPost } from "@/ai/services/blog-generator";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { proposeBlogForPuzzle } from "@/lib/blog/propose-puzzle-blog";

const requestSchema = z.object({
  puzzleId: z.string().min(1),
  title: z.string().min(10).max(100),
  slug: z.string().min(3).max(100),
  content: z.string().min(200),
  excerpt: z.string().min(20).max(300),
  sections: z.record(z.string(), z.unknown()).optional(),
  seoMetadata: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/admin/blogs/propose — open a draft PR for an edited AI post. */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid blog post", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const puzzle = await getCollection<Puzzle>("puzzles").findOne({ id: parsed.data.puzzleId });
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const editedPost: GeneratedBlogPost = {
      title: parsed.data.title,
      slug: parsed.data.slug,
      content: parsed.data.content,
      excerpt: parsed.data.excerpt,
      sections: parsed.data.sections as GeneratedBlogPost["sections"],
      seoMetadata: parsed.data.seoMetadata as GeneratedBlogPost["seoMetadata"],
    };
    const result = await proposeBlogForPuzzle(puzzle, editedPost);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      proposal: result,
      message:
        "skipped" in result ? "A blog proposal already exists" : "Draft blog pull request opened",
    });
  } catch (error) {
    console.error("Admin blog proposal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to open blog pull request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
