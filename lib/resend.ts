import { Resend } from "resend";

// Check for RESEND_API_KEY and log detailed information
console.log("[ResendAPI] Environment check on module load:", {
	hasResendKey: !!process.env.RESEND_API_KEY,
	keyLength: process.env.RESEND_API_KEY?.length || 0,
	keyPrefix: process.env.RESEND_API_KEY?.substring(0, 3) || "none",
	nodeEnv: process.env.NODE_ENV,
	processEnvKeys: Object.keys(process.env).filter((key) => key.includes("RESEND")),
});

if (!process.env.RESEND_API_KEY) {
	console.error("[ResendAPI] RESEND_API_KEY environment variable is not set. Email functionality will not work.");
	console.error("[ResendAPI] Please add RESEND_API_KEY to your .env.local file");
	console.error("[ResendAPI] You can get an API key from https://resend.com");
}

// Initialize Resend client with error handling
let resend: Resend;
try {
	if (!process.env.RESEND_API_KEY?.startsWith("re_")) {
		throw new Error("Invalid Resend API key format - should start with 're_'");
	}
	resend = new Resend(process.env.RESEND_API_KEY);
	console.log("[ResendAPI] Resend client initialized successfully with key prefix:", process.env.RESEND_API_KEY.substring(0, 3));
} catch (error) {
	console.error("[ResendAPI] Failed to initialize Resend client:", error);
	// Create a dummy client that logs errors
	const dummyClient = {
		emails: {
			send: async () => {
				throw new Error("Resend client not properly initialized - missing or invalid API key");
			},
		},
		batch: {
			send: async () => {
				throw new Error("Resend client not properly initialized - missing or invalid API key");
			},
		},
		apiKeys: {},
		contacts: {},
		domains: {},
		audiences: {},
		headers: {},
	};
	resend = dummyClient as unknown as Resend;
}

interface EmailResponse {
	success: boolean;
	emailId?: string;
	error?: string;
}

interface NotificationEmail {
	email: string;
	subject: string;
	content: string;
}

// Constants for email configuration
const FROM_EMAIL = "Rebuzzle <onboarding@resend.dev>"; // Using Resend's testing domain

export async function sendNotificationEmail(email: string, subject: string, content: string): Promise<EmailResponse> {
	try {
		console.log("[ResendAPI] Starting email send process:", {
			to: email,
			from: FROM_EMAIL,
			subject: subject,
			contentLength: content.length,
			hasResendKey: !!process.env.RESEND_API_KEY,
			keyLength: process.env.RESEND_API_KEY?.length || 0,
			keyPrefix: process.env.RESEND_API_KEY?.substring(0, 3) || "none",
			nodeEnv: process.env.NODE_ENV,
			resendInstance: !!resend,
			resendKeys: Object.keys(resend || {}),
		});

		if (!process.env.RESEND_API_KEY) {
			console.error("[ResendAPI] Cannot send email - RESEND_API_KEY is not set");
			throw new Error("Email service is not configured (RESEND_API_KEY missing)");
		}

		if (!process.env.RESEND_API_KEY.startsWith("re_")) {
			console.error("[ResendAPI] Invalid API key format:", {
				keyPrefix: process.env.RESEND_API_KEY.substring(0, 3),
				keyLength: process.env.RESEND_API_KEY.length,
			});
			throw new Error("Invalid Resend API key format");
		}

		// In server components/API routes, use the email provided
		let toEmail = email;

		console.log("[ResendAPI] Preparing email payload:", {
			from: FROM_EMAIL,
			to: toEmail,
			subject: subject,
			contentPreview: content.substring(0, 100) + "...",
			resendEmailsExists: !!(resend && resend.emails),
			resendEmailsSendExists: !!(resend && resend.emails && resend.emails.send),
		});

		try {
			console.log("[ResendAPI] Attempting to send email with Resend...");
			const response = await resend.emails.send({
				from: FROM_EMAIL,
				to: [toEmail],
				subject: subject,
				html: content,
				tags: [{ name: "type", value: "welcome_email" }],
			});

			console.log("[ResendAPI] Raw response from Resend:", {
				response,
				responseType: typeof response,
				responseKeys: response ? Object.keys(response) : [],
				responseStringified: JSON.stringify(response),
			});

			if (!response || typeof response !== "object") {
				throw new Error("Invalid response from Resend API");
			}

			const emailId = "id" in response ? (response as { id: string }).id : undefined;

			console.log("[ResendAPI] Email sent successfully:", {
				emailId,
				to: toEmail,
				subject: subject,
				responseKeys: Object.keys(response),
			});

			return { success: true, emailId };
		} catch (sendError) {
			console.error("[ResendAPI] Error in Resend API call:", {
				error: sendError,
				message: sendError instanceof Error ? sendError.message : "Unknown error",
				stack: sendError instanceof Error ? sendError.stack : undefined,
				errorType: typeof sendError,
				errorKeys: sendError ? Object.keys(sendError as object) : [],
				errorStringified: JSON.stringify(sendError),
			});
			throw sendError;
		}
	} catch (error) {
		console.error("[ResendAPI] Error sending email:", {
			error: error,
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			email: email,
			subject: subject,
			hasResendKey: !!process.env.RESEND_API_KEY,
			keyLength: process.env.RESEND_API_KEY?.length || 0,
			keyPrefix: process.env.RESEND_API_KEY?.substring(0, 3) || "none",
			nodeEnv: process.env.NODE_ENV,
			errorType: typeof error,
			errorKeys: error ? Object.keys(error as object) : [],
			errorStringified: JSON.stringify(error),
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

export async function sendBatchNotificationEmails(notifications: NotificationEmail[]): Promise<EmailResponse> {
	try {
		const emailBatch = notifications.map(({ email, subject, content }) => ({
			from: FROM_EMAIL,
			to: [email],
			subject: subject,
			html: content,
			tags: [{ name: "type", value: "batch_notification" }],
		}));

		const response = await resend.batch.send(emailBatch);
		console.log("[ResendAPI] Batch emails sent successfully:", response);
		return { success: true };
	} catch (error) {
		console.error("[ResendAPI] Error sending batch emails:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

export async function cancelScheduledEmail(emailId: string): Promise<EmailResponse> {
	try {
		await resend.emails.cancel(emailId);
		console.log("[ResendAPI] Email cancelled successfully:", emailId);
		return { success: true };
	} catch (error) {
		console.error("[ResendAPI] Error cancelling email:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

export async function scheduleEmail(email: string, subject: string, content: string, scheduledAt: Date): Promise<EmailResponse> {
	try {
		const response = await resend.emails.send({
			from: FROM_EMAIL,
			to: [email],
			subject: subject,
			html: content,
			scheduledAt: scheduledAt.toISOString(),
			tags: [{ name: "type", value: "scheduled_email" }],
		});

		const emailId = typeof response === "object" && response !== null ? (response as { id?: string }).id : undefined;

		console.log("[ResendAPI] Email scheduled successfully:", response);
		return { success: true, emailId };
	} catch (error) {
		console.error("[ResendAPI] Error scheduling email:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}
