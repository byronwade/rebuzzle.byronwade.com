import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";
import type { NextRequest } from "next/server";

interface NotificationPayload {
	title: string;
	body: string;
	icon: string;
	badge: string;
	data: {
		url: string;
	};
}

// Configure web-push with your VAPID keys
webpush.setVapidDetails("mailto:notifications@rebuzzle.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function POST(request: NextRequest) {
	try {
		// Verify the request is authorized
		const authHeader = request.headers.get("authorization");
		if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all active subscriptions
		const subscriptions = await prisma.pushSubscription.findMany({
			select: {
				userId: true,
				endpoint: true,
				auth: true,
				p256dh: true,
			},
		});

		if (!subscriptions.length) {
			return NextResponse.json({
				success: true,
				sent: 0,
				failed: 0,
				message: "No active subscriptions found",
			});
		}

		const payload: NotificationPayload = {
			title: "New Rebuzzle Puzzle!",
			body: "Today's puzzle is ready. Come solve it!",
			icon: "/icon-192x192.png",
			badge: "/icon-192x192.png",
			data: {
				url: "https://rebuzzle.com",
			},
		};

		const results = await Promise.allSettled(
			subscriptions.map(async (subscription) => {
				try {
					if (!subscription.auth || !subscription.p256dh) {
						throw new Error("Invalid subscription keys");
					}

					await webpush.sendNotification(
						{
							endpoint: subscription.endpoint,
							keys: {
								auth: subscription.auth,
								p256dh: subscription.p256dh,
							},
						},
						JSON.stringify(payload)
					);

					return { success: true, userId: subscription.userId };
				} catch (error) {
					// If the subscription is invalid, delete it
					if (error instanceof webpush.WebPushError && error.statusCode === 410) {
						await prisma.pushSubscription.delete({
							where: {
								userId_endpoint: {
									userId: subscription.userId,
									endpoint: subscription.endpoint,
								},
							},
						});
					}

					return {
						success: false,
						userId: subscription.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			})
		);

		const successful = results.filter((result) => result.status === "fulfilled" && result.value.success).length;

		const failed = results.filter((result) => result.status === "rejected" || !result.value.success).length;

		return NextResponse.json({
			success: true,
			sent: successful,
			failed,
			total: subscriptions.length,
		});
	} catch (error) {
		console.error("Error sending notifications:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send notifications",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
