import { NextResponse } from "next/server";
import { updateUserStats } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { userId, gameResult } = await request.json();

    if (!userId || !gameResult) {
      return NextResponse.json(
        { error: "User ID and game result are required" },
        { status: 400 }
      );
    }

    const success = await updateUserStats(userId, gameResult);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update user stats" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User stats updated successfully",
    });
  } catch (error) {
    console.error("Failed to update user stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
