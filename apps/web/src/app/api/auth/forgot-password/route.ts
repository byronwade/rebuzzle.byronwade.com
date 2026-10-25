import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { normalizeEmail } from "@/lib/account-validation";
import { getAppUrl } from "@/lib/env";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { sendPasswordResetEmail } from "@/lib/notifications/email-service";

const forgotPasswordIpLimit = rateLimit({
  name: "forgot-password",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

const SUCCESS_MESSAGE =
  "If an account exists with this email, a password reset link has been sent.";

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
export async function POST(request: Request) {
  // Each request can send an email, so cap it per IP and per address.
  const ipLimit = await forgotPasswordIpLimit(request);
  if (ipLimit && !ipLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter ?? 60) } }
    );
  }

  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const emailLimit = await rateLimit({
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
      keyGenerator: () => `forgot-password:email:${email}`,
    })(request);
    if (emailLimit && !emailLimit.success) {
      // Same answer as success: don't reveal whether the address exists.
      return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
    }

    // Find user by email
    const user = await db.userOps.findByEmail(email);

    // Always return success (don't reveal if email exists). Guests have no password.
    if (!user || user.isGuest) {
      return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
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

    // Generate reset URL using centralized app URL
    const resetUrl = `${getAppUrl()}/reset-password?token=${resetToken}`;

    // Send reset email using React Email template
    const emailResult = await sendPasswordResetEmail(user.email, user.username, resetUrl, 1);

    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
      // Still return success to user (don't reveal email issues)
    }

    return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
