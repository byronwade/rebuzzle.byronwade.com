import { clerkMiddleware } from "@clerk/nextjs/server";
import { getFeatureFlag } from "./lib/featureFlags";
import { NextResponse } from "next/server";

export default clerkMiddleware({
	async afterAuth(auth, req) {
		const newLeaderboard = await getFeatureFlag("NEW_LEADERBOARD");
		const advancedAnalytics = await getFeatureFlag("ADVANCED_ANALYTICS");
		const dailyChallenges = await getFeatureFlag("DAILY_CHALLENGES");
		const achievements = await getFeatureFlag("ACHIEVEMENTS");

		const response = NextResponse.next();
		response.headers.set("x-new-leaderboard", newLeaderboard ? "true" : "false");
		response.headers.set("x-advanced-analytics", advancedAnalytics ? "true" : "false");
		response.headers.set("x-daily-challenges", dailyChallenges ? "true" : "false");
		response.headers.set("x-achievements", achievements ? "true" : "false");

		return response;
	},
});

// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
