import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	try {
		// Demo notification sending
		console.log("Demo: Daily puzzle notification would be sent here");

		// In a real implementation, this would:
		// 1. Fetch users with notification preferences
		// 2. Send push notifications
		// 3. Send email notifications
		// 4. Log the results

		const mockResults = {
			emailsSent: 0,
			pushNotificationsSent: 0,
			errors: 0,
			message: "Demo mode - no actual notifications sent",
		};

		return NextResponse.json({
			success: true,
			results: mockResults,
			mode: "demo",
		});
	} catch (error) {
		console.error("Error in notification cron:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send notifications",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	// Allow GET for testing
	return POST(request);
}
