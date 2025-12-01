import { NextResponse } from "next/server";
import { db } from "@/db";
import type { User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { sendPasswordChangeEmail } from "@/lib/notifications/email-service";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * POST /api/auth/change-password
 * Change user password (requires current password verification)
 */
export async function POST(request: Request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!(userId && currentPassword && newPassword)) {
      return NextResponse.json(
        { error: "User ID, current password, and new password are required" },
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
    const user = await usersCollection.findOne({ id: userId });

    if (!(user && user.passwordHash)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password
    await db.userOps.update(user.id, {
      passwordHash: newPasswordHash,
    });

    // Get IP address from request headers (if available)
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? (forwarded.split(",")[0] || forwarded).trim()
      : request.headers.get("x-real-ip") || undefined;

    // Send confirmation email (non-blocking)
    try {
      await sendPasswordChangeEmail(
        user.email,
        user.username,
        new Date(),
        ipAddress
      );
    } catch (emailError) {
      // Log error but don't fail the password change
      console.error("Error sending password change email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message:
        "Password has been changed successfully. A confirmation email has been sent.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}

