import { NextResponse } from "next/server";
import { db } from "@/db";
import { listPublicCreatorPuzzles } from "@/lib/ugc/submissions";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";

type Params = { params: Promise<{ username: string }> };

/** GET /api/creators/[username] — public creator card + approved puzzles. */
export async function GET(_request: Request, { params }: Params) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw || "").trim();
  if (!username || username.length > 40) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const user = await db.userOps.findByUsername(username);
  if (!user || user.isGuest) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const [stats, puzzles] = await Promise.all([
    db.userStatsOps.findByUserId(user.id),
    listPublicCreatorPuzzles(user.username, 48),
  ]);

  return NextResponse.json({
    creator: {
      username: user.username,
      profilePath: profilePathForUsername(user.username),
      createdAt: user.createdAt,
      avatarColorIndex: user.avatarColorIndex,
      avatarCustomInitials: user.avatarCustomInitials,
      stats: {
        points: stats?.points ?? 0,
        streak: stats?.streak ?? 0,
        maxStreak: stats?.maxStreak ?? 0,
        wins: stats?.wins ?? 0,
        totalGames: stats?.totalGames ?? 0,
        level: stats?.level ?? 1,
        puzzlesCreated: puzzles.length,
        puzzlesFeatured: puzzles.filter((row) => row.status === "featured").length,
      },
    },
    puzzles: puzzles.map((row) => ({
      id: row.id,
      slug: row.slug,
      path: communityPuzzlePath(row.slug),
      title: row.title || row.answer,
      rebusPuzzle: row.rebusPuzzle,
      visual: row.visual,
      techniqueId: row.techniqueId,
      difficulty: row.difficulty,
      status: row.status,
      featuredOn: row.featuredOn,
      puzzleId: row.puzzleId,
      updatedAt: row.updatedAt,
    })),
  });
}
