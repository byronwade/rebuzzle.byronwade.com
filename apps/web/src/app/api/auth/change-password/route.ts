import { NextResponse } from "next/server";
import { db } from "@/db";
import type { User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { noteCredentialsChanged } from "@/lib/auth/session-revocation";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { setAuthCookie } from "@/lib/cookies";
import { signToken } from "@/lib/jwt";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { sendPasswordChangeEmail } from "@/lib/notifications/email-service";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * POST /api/auth/change-password
 * Change user password (requires current password verification)
 */
export async function POST(request: Request) {
  try {
    // The signed-in user is the only account this route may change. Never
    // trust a userId from the body: that let anyone guess another user's password.
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limit = await rateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyGenerator: () => getUserKey(`change-password:${authUser.userId}`),
    })(request);
    if (limit && !limit.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } }
      );
    }

    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !(currentPassword && newPassword)
    ) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    // Find user
    const usersCollection = getCollection<User>("users");
    const user = await usersCollection.findOne({ id: authUser.userId });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password. passwordChangedAt signs out every other device.
    const changedAt = new Date();
    await db.userOps.update(user.id, {
      passwordHash: newPasswordHash,
      passwordChangedAt: changedAt,
    });
    noteCredentialsChanged(user.id, changedAt);

    // Get IP address from request headers (if available)
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? (forwarded.split(",")[0] || forwarded).trim()
      : request.headers.get("x-real-ip") || undefined;

    // Send confirmation email (non-blocking)
    try {
      await sendPasswordChangeEmail(user.email, user.username, new Date(), ipAddress);
    } catch (emailError) {
      // Log error but don't fail the password change
      console.error("Error sending password change email:", emailError);
    }

    // Keep this device signed in with a token issued after the change.
    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });
    const response = NextResponse.json({
      success: true,
      message: "Password has been changed successfully. A confirmation email has been sent.",
    });
    return setAuthCookie(response, token);
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}
