import { auth } from "@clerk/nextjs/server";

export async function AuthCheck() {
	try {
		// Disable debug logging for this call
		process.env.CLERK_DEBUG = "false";
		process.env.CLERK_LOGGING_ENABLED = "false";

		await auth();
	} catch (error) {
		// Silently handle any errors
	}
	return null;
}
