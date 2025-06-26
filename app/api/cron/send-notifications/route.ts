import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
	webpush.setVapidDetails(process.env.VAPID_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

export async function POST(request: NextRequest) {
	try {
		// Verify this is a legitimate cron request
		const authHeader = request.headers.get("authorization");
		if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		console.log("[Notifications] Starting daily notification send...");

		// Check if VAPID is configured
		if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
			console.error("[Notifications] VAPID keys not configured");
			return NextResponse.json(
				{
					success: false,
					error: "VAPID keys not configured",
				},
				{ status: 500 }
			);
		}

		// Get today's puzzle
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const todaysPuzzle = await prisma.puzzle.findFirst({
			where: {
				scheduledFor: {
					gte: today,
					lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
				},
			},
		});

		if (!todaysPuzzle) {
			console.log("[Notifications] No puzzle found for today");
			return NextResponse.json({
				success: false,
				error: "No puzzle available for today",
			});
		}

		// Get all active push subscriptions
		const subscriptions = await prisma.pushSubscription.findMany({
			where: {
				// Only get subscriptions from the last 30 days to avoid expired ones
				updatedAt: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
				},
			},
		});

		console.log(`[Notifications] Found ${subscriptions.length} active subscriptions`);

		if (subscriptions.length === 0) {
			return NextResponse.json({
				success: true,
				results: {
					pushNotificationsSent: 0,
					errors: 0,
					message: "No active subscriptions found",
				},
			});
		}

		// Prepare the notification payload optimized for mobile
		const notificationPayload = {
			title: "🧩 New Rebuzzle Puzzle Available!",
			body: "A fresh rebus puzzle is waiting for you. Can you solve today's challenge?",
			icon: "/icon-192x192.png", // Use PNG icon for better mobile support
			badge: "/icon-192x192.png",
			image: "/puzzle-preview.png", // Optional puzzle preview image
			data: {
				url: "/",
				puzzleId: todaysPuzzle.id,
				timestamp: Date.now(),
				difficulty: todaysPuzzle.difficulty,
				type: "daily-puzzle",
			},
			actions: [
				{
					action: "play",
					title: "🎮 Play Now",
					icon: "/icon-192x192.png",
				},
				{
					action: "later",
					title: "⏰ Later",
					icon: "/icon-192x192.png",
				},
			],
			requireInteraction: false, // Don't require interaction on mobile
			silent: false,
			tag: "daily-puzzle",
			renotify: true,
			// Mobile-specific options
			vibrate: [100, 50, 100], // Mobile-friendly vibration
			timestamp: Date.now(),
			// Android-specific
			color: "#8b5cf6", // Purple theme color
			sticky: false,
			// iOS-specific
			sound: "default",
			// Web-specific
			dir: "auto",
			lang: "en-US",
		};

		const results = {
			pushNotificationsSent: 0,
			errors: 0,
			expiredSubscriptions: 0,
		};

		// Send notifications in batches to avoid overwhelming the system
		const batchSize = 100;
		const batches = [];
		for (let i = 0; i < subscriptions.length; i += batchSize) {
			batches.push(subscriptions.slice(i, i + batchSize));
		}

		for (const batch of batches) {
			const promises = batch.map(async (subscription) => {
				try {
					const pushSubscription = {
						endpoint: subscription.endpoint,
						keys: {
							auth: subscription.auth,
							p256dh: subscription.p256dh,
						},
					};

					await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload), {
						TTL: 24 * 60 * 60, // 24 hours
						urgency: "normal",
					});

					results.pushNotificationsSent++;
					console.log(`[Notifications] Sent to subscription ${subscription.id}`);
				} catch (error: any) {
					console.error(`[Notifications] Failed to send to ${subscription.id}:`, error.message);

					// Handle expired subscriptions
					if (error.statusCode === 410 || error.statusCode === 404) {
						console.log(`[Notifications] Removing expired subscription ${subscription.id}`);
						try {
							await prisma.pushSubscription.delete({
								where: { id: subscription.id },
							});
							results.expiredSubscriptions++;
						} catch (deleteError) {
							console.error(`[Notifications] Failed to delete expired subscription:`, deleteError);
						}
					} else {
						results.errors++;
					}
				}
			});

			// Wait for batch to complete before processing next batch
			await Promise.allSettled(promises);

			// Small delay between batches to be respectful to push services
			if (batches.indexOf(batch) < batches.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		console.log("[Notifications] Daily notification send completed:", results);

		return NextResponse.json({
			success: true,
			results: {
				...results,
				puzzleTitle: `Puzzle for ${today.toDateString()}`,
				totalSubscriptions: subscriptions.length,
			},
		});
	} catch (error) {
		console.error("[Notifications] Error in notification cron:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to send notifications",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}

export async function GET(request: NextRequest) {
	// Allow GET for testing
	return POST(request);
}
