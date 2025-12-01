import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.userOps.findById(authUser.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarColorIndex: user.avatarColorIndex,
        avatarCustomInitials: user.avatarCustomInitials,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile (username, avatar)
 */
export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, avatarColorIndex, avatarCustomInitials } = body;

    // Validate username if provided
    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length === 0) {
        return NextResponse.json(
          { error: "Username cannot be empty" },
          { status: 400 }
        );
      }

      if (username.length > 50) {
        return NextResponse.json(
          { error: "Username must be 50 characters or less" },
          { status: 400 }
        );
      }

      // Check if username is already taken by another user
      const currentUser = await db.userOps.findById(authUser.userId);
      if (currentUser && currentUser.username === username.trim()) {
        // Username is the same, no change needed
      } else {
        // Check if another user has this username
        const { getCollection } = await import("@/db/mongodb");
        const usersCollection = getCollection("users");
        const usernameTaken = await usersCollection.findOne({
          username: username.trim(),
          id: { $ne: authUser.userId },
        });

        if (usernameTaken) {
          return NextResponse.json(
            { error: "Username is already taken" },
            { status: 409 }
          );
        }
      }
    }

    // Validate avatar preferences
    if (
      avatarColorIndex !== undefined &&
      (typeof avatarColorIndex !== "number" ||
        avatarColorIndex < 0 ||
        avatarColorIndex > 9)
    ) {
      return NextResponse.json(
        { error: "Avatar color index must be between 0 and 9" },
        { status: 400 }
      );
    }

    if (avatarCustomInitials !== undefined) {
      if (typeof avatarCustomInitials !== "string") {
        return NextResponse.json(
          { error: "Avatar custom initials must be a string" },
          { status: 400 }
        );
      }
      const trimmed = avatarCustomInitials.trim().toUpperCase();
      if (trimmed.length > 2) {
        return NextResponse.json(
          { error: "Avatar custom initials must be 1-2 characters" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: {
      username?: string;
      avatarColorIndex?: number;
      avatarCustomInitials?: string;
    } = {};
    if (username !== undefined) {
      updates.username = username.trim();
    }
    if (avatarColorIndex !== undefined) {
      updates.avatarColorIndex = avatarColorIndex;
    }
    if (avatarCustomInitials !== undefined) {
      updates.avatarCustomInitials =
        avatarCustomInitials.trim().toUpperCase() || undefined;
    }

    // Update user
    await db.userOps.update(authUser.userId, updates);

    // Get updated user
    const updatedUser = await db.userOps.findById(authUser.userId);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatarColorIndex: updatedUser.avatarColorIndex,
        avatarCustomInitials: updatedUser.avatarCustomInitials,
        createdAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
