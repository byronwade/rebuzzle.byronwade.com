import crypto from "crypto";
import { NextResponse } from "next/server";
import type { User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { sendPasswordResetEmail } from "@/lib/notifications/email-service";

/**
 * GET /api/admin/users/[id]
 * Get a single user by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const usersCollection = getCollection<User>("users");
    const user = await usersCollection.findOne({ id });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't expose password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Admin user get error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user and all associated data
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    // Prevent deleting yourself
    if (id === admin.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const usersCollection = getCollection<User>("users");
    const userStatsCollection = getCollection("userStats");
    const emailSubscriptionsCollection = getCollection("emailSubscriptions");
    const analyticsEventsCollection = getCollection("analyticsEvents");
    const userSessionsCollection = getCollection("userSessions");
    const puzzleAttemptsCollection = getCollection("puzzleAttempts");
    const gameSessionsCollection = getCollection("gameSessions");

    // Check if user exists
    const user = await usersCollection.findOne({ id });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all associated data
    await Promise.all([
      usersCollection.deleteOne({ id }),
      userStatsCollection.deleteMany({ userId: id }),
      emailSubscriptionsCollection.deleteMany({ userId: id }),
      analyticsEventsCollection.deleteMany({ userId: id }),
      userSessionsCollection.deleteMany({ userId: id }),
      puzzleAttemptsCollection.deleteMany({ userId: id }),
      gameSessionsCollection.deleteMany({ userId: id }),
    ]);

    return NextResponse.json({
      success: true,
      message: "User and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[id]/send-password-reset
 * Send password reset email to a user
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const usersCollection = getCollection<User>("users");
    const user = await usersCollection.findOne({ id });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Store reset token in user document
    await usersCollection.updateOne(
      { id },
      {
        $set: {
          resetToken,
          resetTokenExpiry,
        },
      }
    );

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com"}/reset-password?token=${resetToken}`;

    // Send reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.username,
      resetUrl,
      1
    );

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send password reset email",
          details: emailResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Admin send password reset error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send password reset email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
