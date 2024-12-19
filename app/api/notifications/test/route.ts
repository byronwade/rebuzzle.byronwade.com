import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST() {
	try {
		// Get all active subscriptions
		const subscriptions = await prisma.pushSubscription.findMany();

		if (!subscriptions.length) {
			return NextResponse.json(
				{
					success: false,
					error: "No active subscriptions found",
				},
				{ status: 404 }
			);
		}

		// Send test notification to all subscriptions
		const results = await Promise.allSettled(
			subscriptions.map((sub) =>
				sendPushNotification({
					subscription: {
						endpoint: sub.endpoint,
						keys: {
							auth: sub.auth,
							p256dh: sub.p256dh,
						},
					},
					title: "Test Notification",
					message: "This is a test notification from Rebuzzle!",
					icon: "/icon-192x192.png",
					badge: "/icon-192x192.png",
				})
			)
		);

		const successful = results.filter((r) => r.status === "fulfilled").length;
		const failed = results.filter((r) => r.status === "rejected").length;

		return NextResponse.json({
			success: true,
			message: `Sent test notifications to ${successful} devices (${failed} failed)`,
		});
	} catch (error) {
		console.error("[TestNotification] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send test notifications",
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
