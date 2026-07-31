import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Revalidation API Endpoint
 *
 * Allows manual cache invalidation for specific tags.
 * Protected by CRON_SECRET or admin authentication.
 *
 * Usage:
 * POST /api/revalidate
 * Body: { "tag": "daily-puzzle" }
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { success: false, error: "Revalidation not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const tag = body.tag as string;

    // Allowed tags for revalidation
    const allowedTags = ["daily-puzzle", "blog-posts", "leaderboard"];

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag is required", allowedTags },
        { status: 400 }
      );
    }

    if (!allowedTags.includes(tag)) {
      return NextResponse.json(
        { success: false, error: `Invalid tag. Allowed: ${allowedTags.join(", ")}` },
        { status: 400 }
      );
    }

    // Revalidate the tag
    revalidateTag(tag, "max");

    console.log(`[Revalidate] Cache tag "${tag}" revalidated successfully`);

    return NextResponse.json({
      success: true,
      tag,
      revalidatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Revalidate] Error:", error);
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
 * GET endpoint for easy testing (requires same auth)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Revalidate daily-puzzle by default
  revalidateTag("daily-puzzle", "max");

  return NextResponse.json({
    success: true,
    tag: "daily-puzzle",
    revalidatedAt: new Date().toISOString(),
    message: "Daily puzzle cache revalidated",
  });
}
