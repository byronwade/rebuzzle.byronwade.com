import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/blog(.*)", "/api/completion", "/api/webhooks/clerk", "/api/notifications/test", "/api/notifications/vapid-public-key", "/sign-in", "/sign-up", "/game-over"]);

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
export default clerkMiddleware(
	async (auth, request: NextRequest) => {
		// Get completion cookie
		if (request.nextUrl.pathname === "/") {
			const completionCookie = request.cookies.get("puzzle_completed");
			const nextPlayTime = request.cookies.get("next_play_time");
			const now = new Date();

			// Get preview/test mode params
			const searchParams = request.nextUrl.searchParams;
			const isPreview = searchParams.get("preview") === "true";
			const isTest = process.env.NODE_ENV === "development" && searchParams.get("test") === "true";

			if (completionCookie?.value === "true" || (nextPlayTime && new Date(nextPlayTime.value) > now)) {
				// Redirect to game over page
				return NextResponse.redirect(new URL("/game-over", request.url));
			}
		}

		if (isPublicRoute(request)) {
			return NextResponse.next();
		}

		// Protect all non-public routes
		await auth.protect();
		return NextResponse.next();
	},
	{ debug: process.env.NODE_ENV === "development" }
);

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
