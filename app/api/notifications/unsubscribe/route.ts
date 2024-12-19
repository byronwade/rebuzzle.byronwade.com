import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	try {
		console.log("[UnsubscribeAPI] Starting unsubscribe request");

		// Parse the request body
		const body = await request.json();
		const { subscriptionId, userId, email } = body;

		// Create an array of valid conditions
		const conditions = [];
		if (subscriptionId) conditions.push({ id: subscriptionId });
		if (userId) conditions.push({ userId: userId });
		if (email) conditions.push({ email: email });

		if (conditions.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "No valid subscription identifier provided",
					details: "Please provide at least one of: subscriptionId, userId, or email",
				},
				{ status: 400 }
			);
		}

		console.log("[Prisma Query] deleteMany", { where: { OR: conditions } });

		// Delete the subscription(s)
		const result = await prisma.pushSubscription.deleteMany({
			where: {
				OR: conditions,
			},
		});

		console.log("[UnsubscribeAPI] Unsubscribe result:", result);

		if (result.count === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "No subscriptions found to delete",
					details: "The specified subscription(s) may have already been deleted or never existed",
				},
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: `Successfully unsubscribed from notifications (${result.count} subscription${result.count === 1 ? "" : "s"} deleted)`,
		});
	} catch (error) {
		console.error("[UnsubscribeAPI] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to unsubscribe",
				details: error instanceof Error ? error.message : "An unexpected error occurred",
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
