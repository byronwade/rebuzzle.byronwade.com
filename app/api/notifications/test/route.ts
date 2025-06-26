import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
	webpush.setVapidDetails(process.env.VAPID_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

export async function POST(req: Request) {
	try {
		const { subscriptionId, email, userId } = await req.json();

		console.log("[Notifications] Sending test notification:", {
			subscriptionId,
			email,
			userId,
		});

		// Check if VAPID is configured
		if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
			console.error("[Notifications] VAPID keys not configured");
			return NextResponse.json(
				{
					success: false,
					error: "Push notification service not configured",
				},
				{ status: 503 }
			);
		}

		if (!subscriptionId) {
			return NextResponse.json(
				{
					success: false,
					error: "Subscription ID required",
				},
				{ status: 400 }
			);
		}

		try {
			// Get the subscription from database
			const subscription = await prisma.pushSubscription.findUnique({
				where: { id: subscriptionId },
			});

			if (!subscription) {
				return NextResponse.json(
					{
						success: false,
						error: "Subscription not found",
					},
					{ status: 404 }
				);
			}

			// Prepare the test notification payload
			const notificationPayload = {
				title: "🧩 Test Notification - Rebuzzle",
				body: "Great! You'll now receive daily puzzle reminders at 8 AM. Happy puzzling! 🎉",
				icon: "/icon-192x192.png",
				badge: "/icon-192x192.png",
				data: {
					url: "/",
					type: "test",
					timestamp: Date.now(),
				},
				actions: [
					{
						action: "play",
						title: "🎮 Play Now",
						icon: "/icon-192x192.png",
					},
				],
				requireInteraction: false,
				silent: false,
				tag: "test-notification",
				vibrate: [100, 50, 100],
				timestamp: Date.now(),
			};

			// Create push subscription object
			const pushSubscription = {
				endpoint: subscription.endpoint,
				keys: {
					auth: subscription.auth,
					p256dh: subscription.p256dh,
				},
			};

			// Send the test notification
			await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload), {
				TTL: 60 * 60, // 1 hour
				urgency: "normal",
			});

			console.log("[Notifications] Test notification sent successfully to:", subscriptionId);

			return NextResponse.json({
				success: true,
				message: "Test notification sent successfully",
			});
		} catch (dbError) {
			console.error("[Notifications] Database error:", dbError);
			return NextResponse.json(
				{
					success: false,
					error: "Failed to retrieve subscription",
					details: dbError instanceof Error ? dbError.message : "Database error",
				},
				{ status: 500 }
			);
		}

	} catch (error: any) {
		console.error("[Notifications] Error sending test notification:", error);
		
		// Handle specific push service errors
		if (error.statusCode === 410 || error.statusCode === 404) {
			return NextResponse.json({
				success: false,
				error: "Subscription expired or invalid",
				details: "Please re-enable notifications",
			}, { status: 410 });
		}

		return NextResponse.json({
			success: false,
			error: "Failed to send test notification",
			details: error instanceof Error ? error.message : "Unknown error",
		}, { status: 500 });
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
