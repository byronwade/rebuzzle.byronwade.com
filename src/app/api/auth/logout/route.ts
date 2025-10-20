import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Clear any server-side session data
    // In production, this would clear Neon Auth session
    
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout failed:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
