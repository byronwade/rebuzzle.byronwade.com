import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Puzzle completion is now tracked in database
    // No cookies needed

    // eslint-disable-next-line no-console
    console.log("Puzzle completion recorded in database");

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in completion API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set completion state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
