import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { endpoint, email } = await req.json();

		console.log("[Demo Unsubscribe] Would unsubscribe:", {
			endpoint,
			email,
		});

		// Demo mode - simulate successful unsubscribe
		return NextResponse.json({
			success: true,
			message: "Demo mode - subscription would be removed",
			mode: "demo",
		});
	} catch (error) {
		console.error("[Demo Unsubscribe] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to unsubscribe",
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
