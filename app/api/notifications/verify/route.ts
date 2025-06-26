import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	try {
		// Get subscription data from request body
		const subscription = await req.json();
		console.log("[Demo Verify] Received subscription:", subscription);

		if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
			console.log("[Demo Verify] Invalid subscription data:", { subscription });
			return NextResponse.json(
				{
					error: "Invalid subscription data",
					details: {
						hasEndpoint: !!subscription?.endpoint,
						hasAuth: !!subscription?.keys?.auth,
						hasP256dh: !!subscription?.keys?.p256dh,
					},
				},
				{ status: 400 }
			);
		}

		// Demo mode - simulate successful verification
		console.log("[Demo Verify] Would verify subscription for endpoint:", subscription.endpoint);

		return NextResponse.json({
			success: true,
			subscription: {
				id: "demo-subscription-id",
				endpoint: subscription.endpoint,
				verified: true,
			},
			mode: "demo",
		});
	} catch (err: unknown) {
		const error = err as Error;
		console.error("[Demo Verify] Error details:", {
			name: error.name,
			message: error.message,
			stack: error.stack,
		});
		return NextResponse.json(
			{
				error: "Failed to verify subscription",
				details: error.message,
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
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
