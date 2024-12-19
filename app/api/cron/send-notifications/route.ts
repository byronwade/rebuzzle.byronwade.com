import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { dailyPuzzleEmail } from "@/emails/dailyPuzzle";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
	try {
		// Verify that this is a legitimate Vercel cron request
		const authHeader = req.headers.get("authorization");
		if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			return new Response("Unauthorized", { status: 401 });
		}

		console.log("[Daily Notifications] Starting daily notification process");

		// Get all subscribed users
		const subscribers = await prisma.pushSubscription.findMany({
			where: {
				email: {
					not: null,
				},
			},
			distinct: ["email"],
		});

		console.log("[Daily Notifications] Found subscribers:", subscribers.length);

		const template = dailyPuzzleEmail();
		let successCount = 0;
		let errorCount = 0;

		// Send emails in batches of 10 to avoid rate limits
		for (let i = 0; i < subscribers.length; i += 10) {
			const batch = subscribers.slice(i, i + 10);
			const promises = batch.map(async (subscriber) => {
				if (!subscriber.email) return; // TypeScript check

				try {
					const result = await resend.emails.send({
						from: "Rebuzzle <onboarding@resend.dev>",
						to: subscriber.email,
						subject: "🎯 Your Daily Rebuzzle is Ready!",
						html: template.html,
						text: template.text,
					});

					console.log("[Daily Notifications] Sent email to:", subscriber.email);
					successCount++;
					return result;
				} catch (error) {
					console.error("[Daily Notifications] Error sending to:", subscriber.email, error);
					errorCount++;
					return null;
				}
			});

			await Promise.all(promises);
			// Small delay between batches
			if (i + 10 < subscribers.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		console.log("[Daily Notifications] Completed:", {
			total: subscribers.length,
			success: successCount,
			error: errorCount,
		});

		return NextResponse.json({
			success: true,
			stats: {
				total: subscribers.length,
				success: successCount,
				error: errorCount,
			},
		});
	} catch (error) {
		console.error("[Daily Notifications] Error in cron job:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
