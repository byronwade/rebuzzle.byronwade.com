import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
	try {
		const { subscriptionId, userId, email } = await req.json();

		console.log("[Notifications] Unsubscribing:", {
			subscriptionId,
			userId,
			email,
		});

		if (!subscriptionId && !userId && !email) {
			return NextResponse.json(
				{
					success: false,
					error: "Subscription ID, user ID, or email required",
				},
				{ status: 400 }
			);
		}

		try {
			let deletedCount = 0;

			if (subscriptionId) {
				// Delete by subscription ID (most specific)
				const result = await prisma.pushSubscription.deleteMany({
					where: { id: subscriptionId },
				});
				deletedCount = result.count;
			} else {
				// Delete by user identifier
				const userIdentifier = userId || email;
				if (userIdentifier) {
					const result = await prisma.pushSubscription.deleteMany({
						where: { userId: userIdentifier },
					});
					deletedCount = result.count;
				}
			}

			if (deletedCount > 0) {
				console.log("[Notifications] Successfully unsubscribed:", deletedCount, "subscriptions");
				return NextResponse.json({
					success: true,
					message: "Successfully unsubscribed from notifications",
					deletedCount,
				});
			} else {
				console.log("[Notifications] No subscriptions found to delete");
				return NextResponse.json({
					success: true,
					message: "No active subscriptions found",
					deletedCount: 0,
				});
			}
		} catch (dbError) {
			console.error("[Notifications] Database error:", dbError);
			return NextResponse.json(
				{
					success: false,
					error: "Failed to unsubscribe",
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
				error: "Failed to unsubscribe",
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
