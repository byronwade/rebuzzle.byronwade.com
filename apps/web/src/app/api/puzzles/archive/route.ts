import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Puzzle } from "@/db/models";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { isPublishedPastPuzzle } from "@/lib/game/archive-puzzles";
import { getLocalPuzzleDate, getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";
import { toPublicVisual } from "@/lib/game/public-visual";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";
import { resolveRequestTimeZone } from "@/lib/timezone";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 30;
const NO_STORE = { "Cache-Control": "private, no-store" };

const archiveIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    return `rate-limit:puzzle-archive:${ip}`;
  },
});

type ArchiveCursor = { publishedAt: Date; id: string };

function parseLimit(value: string | null): number {
  if (value === null) return DEFAULT_PAGE_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PAGE_LIMIT;
  return Math.min(parsed, MAX_PAGE_LIMIT);
}

function decodeCursor(value: string | null, localDateKey: string): ArchiveCursor | null | false {
  if (value === null) return null;
  if (value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      publishedAt?: unknown;
      id?: unknown;
    };
    if (typeof decoded.id !== "string" || decoded.id.length === 0) return false;
    if (typeof decoded.publishedAt !== "string") return false;
    const publishedAt = new Date(decoded.publishedAt);
    if (
      !Number.isFinite(publishedAt.getTime()) ||
      publishedAt.toISOString() !== decoded.publishedAt
    ) {
      return false;
    }
    if (!isPublishedPastPuzzle({ active: true, publishedAt }, localDateKey)) return false;
    return { publishedAt, id: decoded.id };
  } catch {
    return false;
  }
}

function encodeCursor(cursor: ArchiveCursor): string {
  return Buffer.from(
    JSON.stringify({ publishedAt: cursor.publishedAt.toISOString(), id: cursor.id })
  ).toString("base64url");
}

function toArchiveItem(puzzle: Puzzle) {
  const raw = puzzle as unknown as Record<string, unknown>;
  const publishedAt =
    raw.publishedAt instanceof Date ? raw.publishedAt : new Date(String(raw.publishedAt));
  const puzzleText = raw.puzzle ?? raw.rebusPuzzle;

  return toPublicPuzzle({
    id: raw.id,
    puzzle: puzzleText,
    rebusPuzzle: raw.rebusPuzzle,
    puzzleType: raw.puzzleType ?? "rebus",
    difficulty: raw.difficulty,
    hints: Array.isArray(raw.hints)
      ? raw.hints.filter((hint): hint is string => typeof hint === "string")
      : [],
    date: getUtcPuzzleDate(publishedAt),
    visual: toPublicVisual(raw.visual),
    aiGenerated: raw.aiGenerated ?? false,
  });
}

/** Read-only catalog of published daily puzzles before the caller's daily date. */
export async function GET(request: Request) {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401, headers: NO_STORE }
      );
    }
    const [ipLimit, userLimit] = await Promise.all([
      archiveIpRateLimit(request),
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 30,
        keyGenerator: () => getUserKey(`puzzle-archive:${user.userId}`),
      })(request),
    ]);
    if ((ipLimit && !ipLimit.success) || (userLimit && !userLimit.success)) {
      return NextResponse.json(
        { success: false, error: "Too many archive requests. Slow down." },
        { status: 429, headers: NO_STORE }
      );
    }
    if (!(await hasPlusEntitlement(request))) {
      return NextResponse.json(
        { success: false, error: "Rebuzzle Plus is required to open the puzzle archive." },
        { status: 403, headers: NO_STORE }
      );
    }
    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const localDateKey = getLocalPuzzleDate(now, timeZone);
    const beforeUtc = new Date(`${localDateKey}T00:00:00.000Z`);
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const after = decodeCursor(url.searchParams.get("cursor"), localDateKey);

    if (after === false) {
      return NextResponse.json(
        { error: "Invalid archive cursor" },
        { status: 400, headers: NO_STORE }
      );
    }

    const rows = await db.puzzleOps.findPublishedBefore({
      beforeUtc,
      limit: limit + 1,
      ...(after ? { after } : {}),
    });
    const pastRows = rows.filter((row) => isPublishedPastPuzzle(row, localDateKey));
    const hasMore = pastRows.length > limit;
    const page = pastRows.slice(0, limit);
    const last = page.at(-1);
    const lastPublishedAt = last?.publishedAt;

    return NextResponse.json(
      {
        items: page.map(toArchiveItem),
        nextCursor:
          hasMore && last && lastPublishedAt instanceof Date
            ? encodeCursor({ publishedAt: lastPublishedAt, id: last.id })
            : null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Error loading puzzle archive:", error);
    return NextResponse.json(
      { error: "Unable to load puzzle archive" },
      { status: 500, headers: NO_STORE }
    );
  }
}
