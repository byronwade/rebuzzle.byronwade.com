import { NextResponse } from "next/server";
import { db } from "@/db";
import { validateUsername } from "@/lib/account-validation";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { buildCacheControl } from "@/lib/http/cache-headers";

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Cache-Control": buildCacheControl({
              private: true,
            }),
          },
        }
      );
    }

    const user = await db.userOps.findById(authUser.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": buildCacheControl({
              private: true,
            }),
          },
        }
      );
    }

    return NextResponse.json(
      {
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
      },
      { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
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
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Cache-Control": buildCacheControl({
              private: true,
            }),
          },
        }
      );
    }

    const body = await request.json();
    const { username, avatarColorIndex, avatarCustomInitials } = body;

    // Validate username if provided
    if (username !== undefined) {
      const currentUser = await db.userOps.findById(authUser.userId);
      const unchanged = typeof username === "string" && currentUser?.username === username.trim();
      if (!unchanged) {
        const usernameError = validateUsername(username);
        if (usernameError) {
          return NextResponse.json(
            { error: usernameError },
            { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
          );
        }

        // Case-insensitive: /u/Bob and /u/bob are the same profile URL.
        if (await db.userOps.isUsernameTaken(username, authUser.userId)) {
          return NextResponse.json(
            { error: "Username is already taken" },
            { status: 409, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
          );
        }
      }
    }

    // Validate avatar preferences
    if (
      avatarColorIndex !== undefined &&
      (typeof avatarColorIndex !== "number" || avatarColorIndex < 0 || avatarColorIndex > 9)
    ) {
      return NextResponse.json(
        { error: "Avatar color index must be between 0 and 9" },
        { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    if (avatarCustomInitials !== undefined) {
      if (typeof avatarCustomInitials !== "string") {
        return NextResponse.json(
          { error: "Avatar custom initials must be a string" },
          { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
        );
      }
      const trimmed = avatarCustomInitials.trim().toUpperCase();
      if (trimmed.length > 2) {
        return NextResponse.json(
          { error: "Avatar custom initials must be 1-2 characters" },
          { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
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
      updates.avatarCustomInitials = avatarCustomInitials.trim().toUpperCase() || undefined;
    }

    // Update user
    await db.userOps.update(authUser.userId, updates);

    // Get updated user
    const updatedUser = await db.userOps.findById(authUser.userId);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found after update" },
        { status: 404, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    return NextResponse.json(
      {
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
      },
      { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
