import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sendPasswordResetEmail } from "@/lib/notifications/email-service";

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Find user by email
    const user = await db.userOps.findByEmail(email);

    // Always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Store reset token in user document
    await db.userOps.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    // Send reset email using React Email template
    const emailResult = await sendPasswordResetEmail(email, user.username, resetUrl, 1);

    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
      // Still return success to user (don't reveal email issues)
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
