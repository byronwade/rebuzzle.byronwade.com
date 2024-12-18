import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	try {
		// Get the current user
		const { userId } = auth();
		console.log("[SubscribeAPI] Auth check result:", { userId });

		if (!userId) {
			console.log("[SubscribeAPI] No user ID found, returning unauthorized");
			return NextResponse.json({ success: false, error: "Please sign in to enable notifications" }, { status: 401 });
		}

		// Parse the subscription data
		const subscription = await request.json();
		console.log("[SubscribeAPI] Received subscription data:", {
			endpoint: subscription.endpoint,
			auth: subscription.keys?.auth ? "[PRESENT]" : "[MISSING]",
			p256dh: subscription.keys?.p256dh ? "[PRESENT]" : "[MISSING]",
		});

		// Validate subscription data
		if (!subscription.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
			console.error("[SubscribeAPI] Invalid subscription data");
			return NextResponse.json({ success: false, error: "Invalid subscription data" }, { status: 400 });
		}

		// Save or update the subscription in the database
		try {
			// First, try to find an existing subscription
			const existingSubscription = await prisma.pushSubscription.findFirst({
				where: {
					userId,
					endpoint: subscription.endpoint,
				},
			});

			if (existingSubscription) {
				// Update existing subscription
				const result = await prisma.pushSubscription.update({
					where: {
						id: existingSubscription.id,
					},
					data: {
						auth: subscription.keys.auth,
						p256dh: subscription.keys.p256dh,
						updatedAt: new Date(),
					},
				});

				console.log("[SubscribeAPI] Subscription updated successfully:", {
					id: result.id,
					userId: result.userId,
					endpoint: result.endpoint,
				});
			} else {
				// Create new subscription
				const result = await prisma.pushSubscription.create({
					data: {
						userId,
						endpoint: subscription.endpoint,
						auth: subscription.keys.auth,
						p256dh: subscription.keys.p256dh,
					},
				});

				console.log("[SubscribeAPI] Subscription created successfully:", {
					id: result.id,
					userId: result.userId,
					endpoint: result.endpoint,
				});
			}

			return NextResponse.json({
				success: true,
				message: "Subscription saved successfully",
			});
		} catch (dbError) {
			console.error("[SubscribeAPI] Database error:", dbError);
			return NextResponse.json(
				{
					success: false,
					error: "Failed to save subscription to database",
					details: dbError instanceof Error ? dbError.message : "Unknown database error",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("[SubscribeAPI] Error saving subscription:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to save subscription",
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
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
