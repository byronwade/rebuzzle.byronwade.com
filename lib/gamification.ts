export type Achievement = "first_win" | "streak_3" | "streak_7" | "games_10" | "games_30" | "daily_3" | "daily_7";

export interface UserStats {
	points: number;
	streak: number;
	totalGames: number;
	wins: number;
	achievements: Achievement[];
	level: number;
	lastPlayDate: string | null;
	dailyChallengeStreak: number;
}

export function calculatePoints(success: boolean, streak: number, isDailyChallenge: boolean): number {
	let points = 0;

	if (success) {
		// Base points for correct answer
		points += 100;

		// Bonus points for streak
		points += Math.min(streak * 10, 100);

		// Bonus for daily challenge
		if (isDailyChallenge) {
			points += 50;
		}
	}

	return points;
}

export function checkAchievements(stats: UserStats): Achievement[] {
	const newAchievements: Achievement[] = [];

	// First win
	if (stats.wins === 1 && !stats.achievements.includes("first_win")) {
		newAchievements.push("first_win");
	}

	// Streak achievements
	if (stats.streak >= 3 && !stats.achievements.includes("streak_3")) {
		newAchievements.push("streak_3");
	}
	if (stats.streak >= 7 && !stats.achievements.includes("streak_7")) {
		newAchievements.push("streak_7");
	}

	// Games played achievements
	if (stats.totalGames >= 10 && !stats.achievements.includes("games_10")) {
		newAchievements.push("games_10");
	}
	if (stats.totalGames >= 30 && !stats.achievements.includes("games_30")) {
		newAchievements.push("games_30");
	}

	// Daily challenge achievements
	if (stats.dailyChallengeStreak >= 3 && !stats.achievements.includes("daily_3")) {
		newAchievements.push("daily_3");
	}
	if (stats.dailyChallengeStreak >= 7 && !stats.achievements.includes("daily_7")) {
		newAchievements.push("daily_7");
	}

	return newAchievements;
}

export function getLevel(points: number): { level: number; nextLevelThreshold: number } {
	const level = Math.floor(points / 500) + 1;
	const nextLevelThreshold = level * 500;

	return {
		level: Math.min(level, 5), // Cap at level 5
		nextLevelThreshold,
	};
}

export function updateDailyChallenge(stats: UserStats): UserStats {
	const today = new Date().toISOString().split("T")[0];
	const lastPlay = stats.lastPlayDate;

	if (!lastPlay) {
		return {
			...stats,
			dailyChallengeStreak: 1,
			lastPlayDate: today,
		};
	}

	const lastPlayDate = new Date(lastPlay);
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (lastPlayDate.toISOString().split("T")[0] === yesterday.toISOString().split("T")[0]) {
		return {
			...stats,
			dailyChallengeStreak: stats.dailyChallengeStreak + 1,
			lastPlayDate: today,
		};
	}

	return {
		...stats,
		dailyChallengeStreak: 1,
		lastPlayDate: today,
	};
}
