import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { buildCacheControl } from "@/lib/http/cache-headers";

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
        { status: 401, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    return NextResponse.json(
      {
        isAdmin: true,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        },
      },
      { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      {
        isAdmin: false,
        error: "Failed to check admin status",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
