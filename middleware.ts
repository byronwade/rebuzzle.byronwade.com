import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default clerkMiddleware((auth: any, request: NextRequest) => {
	// Get completion cookie
	if (request.nextUrl.pathname === "/") {
		const completionCookie = request.cookies.get("puzzle_completed");
		const nextPlayTime = request.cookies.get("next_play_time");
		const now = new Date();

		// Get preview/test mode params
		const searchParams = request.nextUrl.searchParams;
		const isPreview = searchParams.get("preview") === "true";
		const isTest = process.env.NODE_ENV === "development" && searchParams.get("test") === "true";

		// If in preview/test mode, allow access
		if (isPreview || isTest) {
			return NextResponse.next();
		}

		// Check if puzzle is completed
		if (completionCookie?.value === "true" || (nextPlayTime && new Date(nextPlayTime.value) > now)) {
			// Redirect to game over page
			return NextResponse.redirect(new URL("/game-over", request.url));
		}
	}

	// Public routes that don't require authentication
	const publicPaths = ["/", "/blog", "/api/completion", "/api/webhooks/clerk", "/sign-in", "/sign-up", "/game-over"];
	const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname === path || (path.endsWith("(.*)") && request.nextUrl.pathname.startsWith(path.slice(0, -4))));

	if (isPublicPath) {
		return NextResponse.next();
	}

	// For all other routes, let Clerk handle the authentication
	return NextResponse.next();
});

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
