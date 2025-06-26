import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { email } = await req.json();

		console.log("[Demo Test] Would send test notification to:", email);

		// Demo mode - simulate successful test
		return NextResponse.json({
			success: true,
			message: "Demo mode - test notification would be sent",
			mode: "demo",
		});
	} catch (error) {
		console.error("[Demo Test] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send test notification",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
