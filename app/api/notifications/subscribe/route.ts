import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
	try {
		const { subscription, email, userId, sendWelcomeEmail = false } = await req.json();

		console.log("[Notifications] Processing subscription request:", {
			hasSubscription: !!subscription,
			email,
			userId,
			sendWelcomeEmail,
		});

		if (!subscription) {
			return NextResponse.json({ success: false, error: "No subscription data provided" }, { status: 400 });
		}

		if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
			return NextResponse.json({ success: false, error: "Invalid subscription data" }, { status: 400 });
		}

		// Create user identifier - use userId if authenticated, otherwise use email
		const userIdentifier = userId || email;
		if (!userIdentifier) {
			return NextResponse.json({ success: false, error: "User ID or email required" }, { status: 400 });
		}

		try {
			// Check if subscription already exists for this user
			const existingSubscription = await prisma.pushSubscription.findFirst({
				where: {
					userId: userIdentifier,
					endpoint: subscription.endpoint,
				},
			});

			let savedSubscription;

			if (existingSubscription) {
				// Update existing subscription
				savedSubscription = await prisma.pushSubscription.update({
					where: { id: existingSubscription.id },
					data: {
						auth: subscription.keys.auth,
						p256dh: subscription.keys.p256dh,
						updatedAt: new Date(),
					},
				});
				console.log("[Notifications] Updated existing subscription:", savedSubscription.id);
			} else {
				// Create new subscription
				savedSubscription = await prisma.pushSubscription.create({
					data: {
						userId: userIdentifier,
						endpoint: subscription.endpoint,
						auth: subscription.keys.auth,
						p256dh: subscription.keys.p256dh,
					},
				});
				console.log("[Notifications] Created new subscription:", savedSubscription.id);
			}

			return NextResponse.json({
				success: true,
				message: "Subscription saved successfully",
				subscriptionId: savedSubscription.id,
				isUpdate: !!existingSubscription,
			});
		} catch (dbError) {
			console.error("[Notifications] Database error:", dbError);
			return NextResponse.json(
				{
					success: false,
					error: "Failed to save subscription to database",
					details: dbError instanceof Error ? dbError.message : "Database error",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("[Notifications] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to process subscription",
				details: error instanceof Error ? error.message : "Unknown error",
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
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
