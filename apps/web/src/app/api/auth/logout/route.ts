import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/cookies";

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear authentication cookie
    return clearAuthCookie(response);
  } catch (error) {
    console.error("Logout failed:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
