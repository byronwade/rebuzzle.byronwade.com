import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/blog(.*)", "/api/completion", "/api/webhooks/clerk", "/api/notifications/test", "/api/notifications/vapid-public-key", "/sign-in", "/sign-up", "/game-over"]);

export default clerkMiddleware(
	(auth, request: NextRequest) => {
		// Get completion cookie
		if (request.nextUrl.pathname === "/") {
			const completionCookie = request.cookies.get("puzzle_completed");
			const nextPlayTime = request.cookies.get("next_play_time");
			const now = new Date();

			if (completionCookie?.value === "true" || (nextPlayTime && new Date(nextPlayTime.value) > now)) {
				// Redirect to game over page
				return NextResponse.redirect(new URL("/game-over", request.url));
			}
		}

		if (isPublicRoute(request)) {
			return NextResponse.next();
		}

		// Protect all non-public routes
		return auth.protect();
	},
	{
		debug: false, // Disable debug logging
		publicRoutes: ["/", "/blog(.*)"],
	}
);

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
