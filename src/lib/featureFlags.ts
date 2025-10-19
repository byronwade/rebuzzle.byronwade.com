import { get } from "@vercel/edge-config";

export const featureFlags = {
	NEW_LEADERBOARD: "new_leaderboard",
	ADVANCED_ANALYTICS: "advanced_analytics",
	DAILY_CHALLENGES: "daily_challenges",
	ACHIEVEMENTS: "achievements",
} as const;

export async function getFeatureFlag(flag: keyof typeof featureFlags): Promise<boolean> {
	try {
		if (process.env.NODE_ENV === "development") {
			// In development, enable all features by default
			return true;
		}

		const enabled = await get(flag);
		return !!enabled;
	} catch (error) {
		console.error(`Error fetching feature flag ${flag}:`, error);
		return false;
	}
}
