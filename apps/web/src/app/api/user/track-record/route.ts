/**
 * Daily track record for the signed-in player: a year of days marked solved,
 * failed, or missed, in the player's own time zone.
 */

import { type NextRequest, NextResponse } from "next/server";
import { puzzleAttemptOps, userOps } from "@/db/operations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import {
  buildTrackRecord,
  getTrackRecordStart,
  summarizeTrackRecord,
} from "@/lib/game/track-record";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { resolveRequestTimeZone } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": buildCacheControl({ private: true }) };
  try {
    const authUser = await getAuthenticatedUser(request);
    const user = authUser ? await userOps.findById(authUser.userId) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    }

    const timeZone = await resolveRequestTimeZone();
    const today = getLocalPuzzleDate(new Date(), timeZone);
    const joined = user.createdAt ? getLocalPuzzleDate(new Date(user.createdAt), timeZone) : null;
    const results = await puzzleAttemptOps.getDailyResults(user.id, getTrackRecordStart(today));
    const days = buildTrackRecord({ today, joined, results });

    return NextResponse.json(
      { success: true, today, days, totals: summarizeTrackRecord(days) },
      { headers }
    );
  } catch (error) {
    console.error("Failed to load track record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load track record" },
      { status: 500, headers }
    );
  }
}
