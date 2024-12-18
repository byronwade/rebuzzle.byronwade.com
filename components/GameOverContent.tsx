"use client";

import { Separator } from "@/components/ui/separator";
import { LoginPrompt } from "./LoginPrompt";
import { UserStats } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";
import { ShareButton } from "./ShareButton";
import { Trophy, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { NewLeaderboard } from "./NewLeaderboard";
import { getFeatureFlag, featureFlags } from "@/lib/featureFlags";

interface LeaderboardEntry {
	name: string;
	correctAnswers: number[];
}

interface GameOverContentProps {
	answer: string;
	explanation: string;
	leaderboard: LeaderboardEntry[];
	success: boolean;
	userGuess: string;
	isLoggedIn: boolean;
	userStats: UserStats;
	attempts: number;
	maxAttempts: number;
}

const achievementNames: { [key: string]: string } = {
	first_win: "First Win",
	streak_3: "3-Day Streak",
	streak_7: "7-Day Streak",
	games_10: "10 Games Played",
	games_30: "30 Games Played",
	daily_3: "3-Day Daily Challenge Streak",
	daily_7: "7-Day Daily Challenge Streak",
};

export default function GameOverContent({ answer, explanation, leaderboard, success, userGuess, isLoggedIn, userStats, attempts, maxAttempts }: GameOverContentProps) {
	const newAchievements = userStats.achievements || [];

	const nextLevel = userStats.level < 5 ? userStats.level + 1 : 5;
	const currentLevelThreshold = userStats.level > 1 ? 500 * (userStats.level - 1) : 0;
	const nextLevelThreshold = 500 * userStats.level;
	const progressToNextLevel = ((userStats.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;

	const [newLeaderboardEnabled, setNewLeaderboardEnabled] = useState(false);

	useEffect(() => {
		async function checkFeatureFlag() {
			const isEnabled = await getFeatureFlag("NEW_LEADERBOARD");
			setNewLeaderboardEnabled(isEnabled);
		}
		checkFeatureFlag();
	}, []);

	return (
		<div className="w-full max-w-2xl space-y-8">
			<div className="space-y-4 text-center">
				<h2 className="text-3xl font-bold text-gray-800">{success ? "Congratulations!" : "Better luck next time!"}</h2>
				<p className="text-4xl font-bold text-purple-600">{answer}</p>
				{!success && userGuess !== answer && (
					<p className="text-xl text-gray-600">
						Your guess: <span className="font-semibold">{userGuess}</span>
					</p>
				)}
				<p className="text-gray-700">{explanation}</p>
				<ShareButton success={success} attempts={attempts} maxAttempts={maxAttempts} className="mx-auto mt-4" />
			</div>

			{!isLoggedIn && (
				<div className="mt-8 mb-8">
					<LoginPrompt />
				</div>
			)}

			<div className="space-y-4 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
				<h3 className="text-2xl font-bold text-gray-800 flex items-center">
					<Trophy className="mr-2 text-yellow-500" /> Your Stats
				</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="text-sm text-gray-500">Level</p>
						<p className="text-lg font-semibold text-gray-800">{userStats.level}</p>
					</div>
					<div>
						<p className="text-sm text-gray-500">Points</p>
						<p className="text-lg font-semibold text-gray-800">{userStats.points}</p>
					</div>
					<div>
						<p className="text-sm text-gray-500">Streak</p>
						<p className="text-lg font-semibold text-gray-800">{userStats.streak}</p>
					</div>
					<div>
						<p className="text-sm text-gray-500">Daily Streak</p>
						<p className="text-lg font-semibold text-gray-800">{userStats.dailyChallengeStreak}</p>
					</div>
				</div>
				<div>
					<p className="text-sm text-gray-500 mb-2">Progress to Level {nextLevel}</p>
					<Progress value={progressToNextLevel} className="w-full" />
				</div>
			</div>

			<div className="flex flex-col md:flex-row gap-8">
				<div className="w-full md:w-1/2 space-y-4 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
					<h3 className="text-2xl font-bold text-gray-800 flex items-center">
						<Star className="mr-2 text-yellow-500" /> New Achievements
					</h3>
					{newAchievements.length > 0 ? (
						<ul className="list-disc list-inside">
							{newAchievements.map((achievement, index) => (
								<li key={index} className="text-purple-600">
									{achievementNames[achievement] || achievement}
								</li>
							))}
						</ul>
					) : (
						<p className="text-gray-600">No new achievements this time. Keep playing to earn more!</p>
					)}
				</div>

				{newLeaderboardEnabled ? (
					<NewLeaderboard />
				) : (
					<div className="w-full md:w-1/2 space-y-4 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
						<h2 className="text-2xl font-bold text-gray-800 flex items-center">
							<Zap className="mr-2 text-yellow-500" /> Leaderboard
						</h2>
						<div className="space-y-4">
							{leaderboard.map((entry, index) => (
								<div key={index}>
									<div className="flex justify-between items-center">
										<span className="text-lg font-semibold text-gray-800">{entry.name}</span>
										<span className="text-sm text-gray-500">{entry.correctAnswers.reduce((sum, count) => sum + count, 0)} correct</span>
									</div>
									<div className="mt-2 flex space-x-1">
										{entry.correctAnswers.map((count, dayIndex) => (
											<div key={dayIndex} className="h-4 w-4 bg-purple-600" style={{ opacity: count > 0 ? 1 : 0.2 }} title={`Day ${dayIndex + 1}: ${count} correct`} />
										))}
									</div>
									{index < leaderboard.length - 1 && <Separator className="my-4 bg-gray-200" />}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
