import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get authenticated user from JWT token in cookie
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({
        user: null,
        authenticated: false,
      });
    }

    // Verify user still exists in database and get full user data
    const user = await db.userOps.findById(authUser.userId);

    if (!user) {
      return NextResponse.json({
        user: null,
        authenticated: false,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      authenticated: true,
    });
  } catch (error) {
    console.error("Session check failed:", error);
    return NextResponse.json({
      user: null,
      authenticated: false,
    });
  }
}
