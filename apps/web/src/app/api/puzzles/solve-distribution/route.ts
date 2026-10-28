import { NextResponse } from "next/server";
import { ensureConnection, getCollection } from "@/db/mongodb";
import {
  buildDailySolveDistribution,
  type DailySolveCounts,
} from "@/lib/game/daily-solve-distribution";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { rateLimiters } from "@/lib/middleware/rate-limit";

const PRIVATE_HEADERS = { "Cache-Control": buildCacheControl({ private: true }) };
const PUZZLE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

export async function GET(request: Request) {
  try {
    const limit = await rateLimiters.public(request);
    if (limit && !limit.success) return errorResponse(429, "Too many requests");

    const puzzleId = new URL(request.url).searchParams.get("puzzleId")?.trim() ?? "";
    if (!PUZZLE_ID_PATTERN.test(puzzleId)) return errorResponse(400, "Invalid puzzle ID");

    await ensureConnection();
    const puzzle = await getCollection("puzzles").findOne(
      { id: puzzleId },
      {
        projection: {
          id: 1,
          active: 1,
          publishedAt: 1,
          "metadata.source": 1,
          "metadata.communityPlayable": 1,
        },
      }
    );

    const publishedAt =
      puzzle?.publishedAt instanceof Date
        ? puzzle.publishedAt
        : new Date(String(puzzle?.publishedAt ?? ""));
    const isPublished =
      Number.isFinite(publishedAt.getTime()) && publishedAt.getTime() <= Date.now();
    const isOfficial =
      puzzle?.metadata?.source !== "user" && puzzle?.metadata?.communityPlayable !== true;
    if (puzzle?.active !== true || !isPublished || !isOfficial) {
      return errorResponse(404, "Puzzle not found");
    }

    const attempts = getCollection("puzzleAttempts");
    const [counts = { oneGuess: 0, twoGuesses: 0, threeGuesses: 0, fourPlus: 0 }] = await attempts
      .aggregate<DailySolveCounts>([
        {
          $match: {
            puzzleId,
            isCorrect: true,
            isFinal: true,
            attemptType: { $ne: "finalization" },
            userId: { $type: "string", $ne: "" },
            attemptNumber: { $type: "number", $gte: 1 },
          },
        },
        {
          $match: {
            $expr: { $eq: ["$attemptNumber", { $floor: "$attemptNumber" }] },
          },
        },
        { $group: { _id: "$userId", attemptNumber: { $max: "$attemptNumber" } } },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ["$attemptNumber", 1] }, then: "oneGuess" },
                  { case: { $eq: ["$attemptNumber", 2] }, then: "twoGuesses" },
                  { case: { $eq: ["$attemptNumber", 3] }, then: "threeGuesses" },
                ],
                default: "fourPlus",
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            oneGuess: { $sum: { $cond: [{ $eq: ["$_id", "oneGuess"] }, "$count", 0] } },
            twoGuesses: { $sum: { $cond: [{ $eq: ["$_id", "twoGuesses"] }, "$count", 0] } },
            threeGuesses: { $sum: { $cond: [{ $eq: ["$_id", "threeGuesses"] }, "$count", 0] } },
            fourPlus: { $sum: { $cond: [{ $eq: ["$_id", "fourPlus"] }, "$count", 0] } },
          },
        },
        { $project: { _id: 0, oneGuess: 1, twoGuesses: 1, threeGuesses: 1, fourPlus: 1 } },
      ])
      .toArray();

    return NextResponse.json(buildDailySolveDistribution(counts), { headers: PRIVATE_HEADERS });
  } catch (error) {
    console.error("Error fetching daily solve distribution:", error);
    return errorResponse(500, "Failed to fetch daily solve distribution");
  }
}
