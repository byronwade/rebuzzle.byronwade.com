import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/check
 * Check if current user has admin access
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);

    if (!admin) {
      return NextResponse.json(
        {
          isAdmin: false,
          message: "Admin access required",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      isAdmin: true,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      {
        isAdmin: false,
        error: "Failed to check admin status",
      },
      { status: 500 }
    );
  }
}

