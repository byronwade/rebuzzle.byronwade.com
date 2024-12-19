import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	try {
		// Get authenticated user using getAuth() with request
		const { userId } = getAuth(req);
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get subscription data from request body
		const subscription = await req.json();
		console.log("[Notifications Verify] Received subscription:", subscription);

		if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
			console.log("[Notifications Verify] Invalid subscription data:", { subscription });
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

		// Find existing subscription first
		const existingSubscription = await prisma.pushSubscription.findFirst({
			where: {
				AND: [{ userId: userId }, { endpoint: subscription.endpoint }],
			},
		});

		let result;
		if (existingSubscription) {
			// Update existing subscription
			result = await prisma.pushSubscription.update({
				where: {
					id: existingSubscription.id,
				},
				data: {
					auth: subscription.keys.auth,
					p256dh: subscription.keys.p256dh,
				},
			});
		} else {
			// Create new subscription
			result = await prisma.pushSubscription.create({
				data: {
					userId: userId,
					endpoint: subscription.endpoint,
					auth: subscription.keys.auth,
					p256dh: subscription.keys.p256dh,
				},
			});
		}

		return NextResponse.json({ success: true, subscription: result });
	} catch (err: unknown) {
		const error = err as Error;
		console.error("[Notifications Verify] Error details:", {
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
