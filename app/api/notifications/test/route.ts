import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

// Configure web-push with your VAPID keys
webpush.setVapidDetails("mailto:notifications@rebuzzle.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function POST(request: NextRequest) {
	console.log("[NotificationsAPI] Starting test notification request");
	try {
		// Get the current user
		const { userId } = await auth();
		console.log("[NotificationsAPI] Auth check result:", { userId });

		if (!userId) {
			console.log("[NotificationsAPI] No user ID found, returning unauthorized");
			return NextResponse.json({ success: false, error: "Please sign in to enable notifications" }, { status: 401 });
		}

		// Get the user's subscription
		const subscription = await prisma.pushSubscription.findFirst({
			where: { userId },
			select: {
				endpoint: true,
				auth: true,
				p256dh: true,
			},
		});

		if (!subscription) {
			console.log("[NotificationsAPI] No subscription found for user");
			return NextResponse.json({ success: false, error: "No notification subscription found" }, { status: 404 });
		}

		// Create a test notification
		const testNotification = {
			title: "Test Notification",
			body: "This is a test notification from Rebuzzle!",
			icon: "/icon.svg",
			badge: "/icon.svg",
			data: {
				url: "/",
			},
		};

		console.log("[NotificationsAPI] Sending test notification:", testNotification);

		// Send the push notification
		await webpush.sendNotification(
			{
				endpoint: subscription.endpoint,
				keys: {
					auth: subscription.auth,
					p256dh: subscription.p256dh,
				},
			},
			JSON.stringify(testNotification)
		);

		console.log("[NotificationsAPI] Test notification sent successfully");

		return NextResponse.json({
			success: true,
			message: "Test notification sent successfully",
			notification: testNotification,
		});
	} catch (error) {
		console.error("[NotificationsAPI] Error in test notification endpoint:", error);
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
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
