import { NextResponse } from "next/server";
import { db } from "@/db";
import type { User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { hashPassword } from "@/lib/password";

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!(token && password)) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find user by reset token
    const usersCollection = getCollection<User>("users");
    const user = await usersCollection.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password and clear reset token
    await db.userOps.update(user.id, {
      passwordHash,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });

    return NextResponse.json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
