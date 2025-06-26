export const gameSettings = {
	maxAttempts: 3,
	puzzlesPerDay: 1,
	nextGameCountdownHours: 24,
	resetTime: "00:00", // UTC
	basePoints: 100,
	streakBonus: 10,
	dailyChallengeBonus: 50,
	maxLevel: 5,
	pointsPerLevel: 500,
} as const;

export type Difficulty = "easy" | "medium" | "hard";

export interface LeaderboardEntry {
	name: string;
	correctAnswers: number[];
}

export interface PuzzleMetadata {
	topic?: string;
	keyword?: string;
	category?: string;
	relevanceScore?: number;
	generatedAt?: string;
	version?: string;
	hints?: string[];
}

export interface GameData {
	id: string;
	rebusPuzzle: string;
	answer: string;
	explanation: string;
	difficulty: number;
	leaderboard: LeaderboardEntry[];
	hints?: string[];
	metadata?: PuzzleMetadata;
	isCompleted?: boolean;
	shouldRedirect?: boolean;
	blogPost?: {
		title?: string;
		slug?: string;
		publishedAt?: Date;
	} | null;
}
