import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import type { User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { hashPassword } from "@/lib/password";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare with self to maintain constant time even for length mismatch
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function POST(request: Request) {
  // Add random delay to prevent timing attacks (50-200ms)
  await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));

  try {
    const { token, password } = await request.json();

    if (!(token && password)) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find users with non-expired reset tokens (we'll compare tokens safely after)
    const usersCollection = getCollection<User>("users");
    const usersWithActiveTokens = await usersCollection
      .find({
        resetToken: { $exists: true },
        resetTokenExpiry: { $gt: new Date() },
      })
      .toArray();

    // Use constant-time comparison to find matching token
    const user = usersWithActiveTokens.find(
      (u) => u.resetToken && safeCompare(u.resetToken, token)
    );

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
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
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
