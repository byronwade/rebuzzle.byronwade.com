import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { title, body, userId } = await req.json();

		console.log("[Demo Send] Would send notification:", {
			title,
			body,
			userId,
		});

		// Demo mode - simulate successful send
		return NextResponse.json({
			success: true,
			message: "Demo mode - notification would be sent",
			mode: "demo",
		});
	} catch (error) {
		console.error("[Demo Send] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send notification",
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
