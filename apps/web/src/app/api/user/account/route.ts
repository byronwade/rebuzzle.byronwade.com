import { NextResponse } from "next/server";
import { db, getCollection, getConnection } from "@/db";
import { verifyUserCredentials } from "@/lib/auth";
import { issuedBeforePasswordChange, noteCredentialsChanged } from "@/lib/auth/session-revocation";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { clearAuthCookie } from "@/lib/cookies";

const headers = { "Cache-Control": "private, no-store" };
const failure = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status, headers });

/** Self-service deletion. Client-supplied account IDs are never used. */
export async function DELETE(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return failure("Not authenticated", 401);
    if (request.headers.get("X-Rebuzzle-Confirm") !== "delete-account")
      return failure("Account deletion confirmation required", 400);
    const user = await db.userOps.findById(auth.userId);
    if (!user || issuedBeforePasswordChange(user, auth.issuedAt))
      return failure("Not authenticated", 401);
    if (!user.isGuest) {
      const body = await request.json().catch(() => null);
      if (typeof body?.password !== "string" || !body.password)
        return failure("Current password required", 403);
      const credentials = await verifyUserCredentials(user.email, body.password);
      if (!credentials.valid || credentials.user?.id !== auth.userId)
        return failure("Current password is incorrect", 403);
    }
    const session = (await getConnection()).startSession();
    try {
      await session.withTransaction(async () => {
        // Sequential operations are required inside a MongoDB transaction.
        for (const name of [
          "userStats",
          "emailSubscriptions",
          "analyticsEvents",
          "nativeGrowthEvents",
          "userSessions",
          "puzzleAttempts",
          "dailyProgress",
          "dailyProgressBackfills",
          "practiceRoundTokens",
          "journalNotes",
          "gameSessions",
          "userAchievements",
          "pushSubscriptions",
          "inAppNotifications",
          "aiDecisions",
          "aiFeedback",
          "siteFeedback",
          "userPuzzleSubmissions",
        ]) {
          await getCollection(name).deleteMany({ userId: auth.userId }, { session });
        }
        // Learning pulses encode identity inside feedback IDs rather than a userId field.
        // Escape regex metacharacters so deleting one account cannot match another.
        const escapedUserId = auth.userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        await getCollection("aiLearningEvents").deleteMany(
          { feedbackIds: new RegExp(`^attempt:.*:${escapedUserId}$`) },
          { session }
        );
        if (user.email)
          await getCollection("emailSubscriptions").deleteMany({ email: user.email }, { session });
        await getCollection("puzzles").updateMany(
          { "metadata.createdByUserId": auth.userId },
          {
            $unset: {
              "metadata.createdByUserId": "",
              "metadata.attribution": "",
              "metadata.ugcSubmissionId": "",
            },
          },
          { session }
        );
        await getCollection("users").deleteOne({ id: auth.userId }, { session });
      });
    } finally {
      await session.endSession();
    }
    noteCredentialsChanged(auth.userId, new Date(Date.now() + 1000));
    const response = clearAuthCookie(NextResponse.json({ success: true }, { headers }));
    response.cookies.set("rebuzzle_guest_token", "", { path: "/", maxAge: 0, httpOnly: true });
    return response;
  } catch (error) {
    console.error("[account] Deletion failed", error);
    return failure("Unable to delete account. Please try again.", 500);
  }
}
