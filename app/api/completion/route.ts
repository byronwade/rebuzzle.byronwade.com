import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		tomorrow.setUTCHours(0, 0, 0, 0);

		// Set completion cookies for demo mode
		cookieStore.set("puzzle_completed", "true", {
			expires: tomorrow,
			path: "/",
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
		});

		cookieStore.set("next_play_time", tomorrow.toISOString(), {
			expires: tomorrow,
			path: "/",
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
		});

		console.log("Demo: Puzzle completion recorded");

		return NextResponse.json({ success: true, mode: "demo" });
	} catch (error) {
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

export async function OPTIONS(request: NextRequest) {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
