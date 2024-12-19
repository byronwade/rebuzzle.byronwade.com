import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { welcomeEmail } from "@/emails/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);
console.log("[Resend] API Key present:", !!process.env.RESEND_API_KEY);
const AUDIENCE_NAME = "Notification Subscribers";

interface ResendResponse<T> {
	data: T | null;
	error: Error | null;
}

interface Audience {
	id: string;
	name: string;
	created_at: string;
}

interface Contact {
	id: string;
	email: string;
	first_name?: string;
	last_name?: string;
	created_at: string;
	unsubscribed: boolean;
}

interface ResendAudiencesResponse {
	object: string;
	data: {
		object: string;
		data: Audience[];
	};
}

interface ResendContactsResponse {
	object: string;
	data: {
		object: string;
		data: Contact[];
	};
}

async function getOrCreateAudience() {
	try {
		console.log("[Resend] Attempting to get or create audience");
		// First try to find existing audience
		const audiences = (await resend.audiences.list()) as unknown as ResendAudiencesResponse;
		console.log("[Resend] Raw audiences response:", JSON.stringify(audiences, null, 2));

		const audienceList = audiences.data?.data || [];
		console.log("[Resend] Current audiences:", audienceList);

		const existingAudience = audienceList.find((a: Audience) => a.name === AUDIENCE_NAME);

		if (existingAudience) {
			console.log("[Resend] Found existing audience:", existingAudience.id);
			return existingAudience.id;
		}

		// Create new audience if none exists
		console.log("[Resend] Creating new audience:", AUDIENCE_NAME);
		const newAudience = (await resend.audiences.create({ name: AUDIENCE_NAME })) as unknown as ResendResponse<Audience>;
		console.log("[Resend] Raw new audience response:", JSON.stringify(newAudience, null, 2));

		if (!newAudience.data) {
			console.error("[Resend] Failed to create audience:", newAudience);
			throw new Error("Failed to create audience: No data returned");
		}

		console.log("[Resend] Created new audience:", newAudience.data);
		return newAudience.data.id;
	} catch (error) {
		console.error("[Resend] Error managing audience:", error);
		if (error instanceof Error) {
			console.error("[Resend] Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name,
			});
		}
		return null;
	}
}

async function addOrUpdateContact(audienceId: string, email: string, firstName?: string) {
	try {
		console.log("[Resend] Starting contact management for:", { email, audienceId, firstName });
		// Try to find existing contact
		const contacts = (await resend.contacts.list({ audienceId })) as unknown as ResendContactsResponse;
		console.log("[Resend] Raw contacts response:", JSON.stringify(contacts, null, 2));

		const contactList = contacts.data?.data || [];
		console.log("[Resend] Current contacts:", contactList);

		const existingContact = contactList.find((c: Contact) => c.email === email);

		if (existingContact) {
			console.log("[Resend] Updating existing contact:", {
				id: existingContact.id,
				email,
				audienceId,
			});
			const updateResult = await resend.contacts.update({
				id: existingContact.id,
				audienceId,
				firstName,
				unsubscribed: false,
			});
			console.log("[Resend] Raw contact update result:", JSON.stringify(updateResult, null, 2));
			return true;
		}

		// Create new contact if none exists
		console.log("[Resend] Creating new contact:", {
			email,
			audienceId,
			firstName,
		});
		const result = (await resend.contacts.create({
			email,
			firstName,
			audienceId,
			unsubscribed: false,
		})) as unknown as ResendResponse<Contact>;

		console.log("[Resend] Raw contact creation result:", JSON.stringify(result, null, 2));

		if (!result.data) {
			console.error("[Resend] Failed to create contact:", result);
			throw new Error("Failed to create contact: No data returned");
		}

		console.log("[Resend] Successfully created contact:", email);
		return true;
	} catch (error) {
		if (error instanceof Error && error.message.includes("already exists")) {
			console.log("[Resend] Contact already exists (race condition):", email);
			return true;
		}
		console.error("[Resend] Error managing contact:", error);
		if (error instanceof Error) {
			console.error("[Resend] Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name,
			});
		}
		return false;
	}
}

export async function POST(req: Request) {
	try {
		const { subscription, email, userId, sendWelcomeEmail = false } = await req.json();

		console.log("[Subscribe] Processing subscription request:", {
			hasSubscription: !!subscription,
			email,
			userId,
			sendWelcomeEmail,
		});

		if (!subscription) {
			return NextResponse.json({ success: false, error: "No subscription data provided" }, { status: 400 });
		}

		// Create or update the subscription in the database
		const result = await prisma.pushSubscription.create({
			data: {
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				userId,
				email,
			},
		});

		console.log("[Subscribe] Created subscription:", {
			id: result.id,
			endpoint: result.endpoint,
			userId: result.userId,
			email: result.email,
		});

		// Get or create the audience and add/update the contact
		if (email) {
			console.log("[Subscribe] Starting contact management process for:", email);
			const audienceId = await getOrCreateAudience();
			console.log("[Subscribe] Got audience ID:", audienceId);

			if (audienceId) {
				const contactResult = await addOrUpdateContact(audienceId, email);
				console.log("[Subscribe] Contact management result:", contactResult);
			} else {
				console.error("[Subscribe] Failed to get/create audience");
			}
		}

		// Send welcome email if requested
		if (sendWelcomeEmail && email) {
			try {
				console.log("[Subscribe] Starting welcome email process for:", email);
				const template = welcomeEmail();
				console.log("[Subscribe] Generated email template:", {
					hasHtml: !!template.html,
					hasText: !!template.text,
					htmlLength: template.html?.length,
					textLength: template.text?.length,
				});

				const emailResult = await resend.emails.send({
					from: "Rebuzzle <onboarding@resend.dev>",
					to: email,
					subject: "Welcome to Rebuzzle Notifications! 🎉",
					html: template.html,
					text: template.text,
				});

				console.log("[Subscribe] Raw email send result:", JSON.stringify(emailResult, null, 2));
			} catch (error) {
				console.error("[Subscribe] Error sending welcome email:", error);
				if (error instanceof Error) {
					console.error("[Subscribe] Email error details:", {
						message: error.message,
						stack: error.stack,
						name: error.name,
					});
				}
			}
		}

		return NextResponse.json({
			success: true,
			subscriptionId: result.id,
		});
	} catch (error) {
		console.error("[Subscribe] Error creating subscription:", error);
		if (error instanceof Error) {
			console.error("[Subscribe] Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name,
			});
		}
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to create subscription",
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
