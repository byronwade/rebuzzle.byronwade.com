import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	try {
		// Get subscription data from request body
		const { subscription, email, userId } = await req.json();
		console.log("[Notifications] Verifying subscription:", {
			hasSubscription: !!subscription,
			email,
			userId,
		});

		if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
			console.log("[Notifications] Invalid subscription data:", { subscription });
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

		// Create user identifier - use userId if authenticated, otherwise use email
		const userIdentifier = userId || email;
		if (!userIdentifier) {
			return NextResponse.json({ error: "User ID or email required" }, { status: 400 });
		}

		try {
			// Look up existing subscription in database
			const existingSubscription = await prisma.pushSubscription.findFirst({
				where: {
					userId: userIdentifier,
					endpoint: subscription.endpoint,
				},
			});

			if (existingSubscription) {
				// Verify the subscription keys match
				const keysMatch = existingSubscription.auth === subscription.keys.auth && existingSubscription.p256dh === subscription.keys.p256dh;

				if (keysMatch) {
					console.log("[Notifications] Subscription verified:", existingSubscription.id);
					return NextResponse.json({
						success: true,
						subscriptionId: existingSubscription.id,
						verified: true,
					});
				} else {
					// Keys don't match, update them
					const updatedSubscription = await prisma.pushSubscription.update({
						where: { id: existingSubscription.id },
						data: {
							auth: subscription.keys.auth,
							p256dh: subscription.keys.p256dh,
							updatedAt: new Date(),
						},
					});
					console.log("[Notifications] Subscription updated:", updatedSubscription.id);
					return NextResponse.json({
						success: true,
						subscriptionId: updatedSubscription.id,
						verified: true,
						updated: true,
					});
				}
			} else {
				// Subscription not found, return 410 to trigger re-subscription
				console.log("[Notifications] Subscription not found for user:", userIdentifier);
				return NextResponse.json(
					{
						error: "Subscription not found",
						details: "Please re-subscribe to notifications",
					},
					{ status: 410 }
				);
			}
		} catch (dbError) {
			console.error("[Notifications] Database error:", dbError);
			return NextResponse.json(
				{
					error: "Failed to verify subscription",
					details: dbError instanceof Error ? dbError.message : "Database error",
				},
				{ status: 500 }
			);
		}
	} catch (err: unknown) {
		const error = err as Error;
		console.error("[Notifications] Error details:", {
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
	} finally {
		await prisma.$disconnect();
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
