import { track } from "@vercel/analytics";

export const analyticsEvents = {
	GAME_START: "game_start",
	GAME_COMPLETE: "game_complete",
	GUESS_SUBMITTED: "guess_submitted",
	USER_LOGIN: "user_login",
	BLOG_POST_VIEW: "blog_post_view",
} as const;

export function trackEvent(eventName: string, eventData?: Record<string, any>) {
	// In development, just log to console
	if (process.env.NODE_ENV === "development") {
		console.log("Analytics Event:", eventName, eventData);
		return;
	}

	// In production, send to analytics services
	try {
		// Send to Vercel Analytics
		track(eventName, eventData);

		// Send to Google Analytics if available
		if (typeof window !== "undefined" && "gtag" in window) {
			// @ts-ignore
			window.gtag("event", eventName, eventData);
		}
	} catch (error) {
		console.error("Error tracking event:", error);
	}
}
