import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { subscription, email, userId, sendWelcomeEmail = false } = await req.json();

		console.log("[Demo Subscribe] Processing subscription request:", {
			hasSubscription: !!subscription,
			email,
			userId,
			sendWelcomeEmail,
		});

		if (!subscription) {
			return NextResponse.json({ success: false, error: "No subscription data provided" }, { status: 400 });
		}

		// Demo mode - just log the subscription
		console.log("[Demo Subscribe] Would store subscription:", {
			endpoint: subscription.endpoint,
			keys: subscription.keys,
			userId,
			email,
		});

		// Simulate successful subscription
		return NextResponse.json({
			success: true,
			message: "Demo mode - subscription recorded locally",
			mode: "demo",
		});
	} catch (error) {
		console.error("[Demo Subscribe] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to process subscription",
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
