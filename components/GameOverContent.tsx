"use client";

import { Separator } from "@/components/ui/separator";
import { LoginPrompt } from "./LoginPrompt";
// UserStats interface moved to local definition
interface UserStats {
	level: number;
	points: number;
	streak: number;
	dailyChallengeStreak: number;
	achievements: string[];
}
import { Progress } from "@/components/ui/progress";
import { ShareButton } from "./ShareButton";
import { Trophy, Star, Zap, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NewLeaderboard } from "./NewLeaderboard";
import { getFeatureFlag, featureFlags } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";

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
		<div className="w-full max-w-full space-y-6">
			{/* Answer reveal section */}
			<div className="text-center space-y-4">
				<div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
					<h3 className="text-lg font-semibold text-gray-800 mb-3">The Answer Was:</h3>
					<div className="text-3xl font-bold text-blue-600 mb-3 break-words">{answer}</div>
					{!success && userGuess !== answer && (
						<p className="text-lg text-gray-600 mb-3 break-words">
							Your guess: <span className="font-semibold text-red-600">{userGuess}</span>
						</p>
					)}
					{explanation && <p className="text-sm text-gray-600 leading-relaxed">{explanation}</p>}
				</div>

				{/* Game stats */}
				<div className="grid grid-cols-2 gap-4">
					<div className="p-4 bg-purple-50 rounded-xl text-center border border-purple-200">
						<div className="text-2xl font-bold text-purple-600">{attempts}</div>
						<div className="text-sm text-gray-600">Attempts Used</div>
					</div>
					<div className="p-4 bg-green-50 rounded-xl text-center border border-green-200">
						<div className="text-2xl font-bold text-green-600">{maxAttempts}</div>
						<div className="text-sm text-gray-600">Total Attempts</div>
					</div>
				</div>

				{/* Share button */}
				<div className="pt-4">
					<ShareButton success={success} attempts={attempts} maxAttempts={maxAttempts} className="mx-auto" />
				</div>
			</div>

			{/* Login prompt for non-authenticated users */}
			{!isLoggedIn && (
				<div className="mt-6 mb-6">
					<LoginPrompt />
				</div>
			)}

			{/* User stats and achievements section */}
			<div className="grid lg:grid-cols-2 gap-6">
				{/* Stats section */}
				<div className="space-y-4 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
					<h3 className="text-xl font-bold text-gray-800 flex items-center">
						<Trophy className="mr-2 text-yellow-500 h-5 w-5" /> Your Stats
					</h3>
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<p className="text-sm text-gray-500">Level</p>
							<p className="text-xl font-semibold text-gray-800">{userStats.level}</p>
						</div>
						<div className="text-center">
							<p className="text-sm text-gray-500">Points</p>
							<p className="text-xl font-semibold text-gray-800">{userStats.points}</p>
						</div>
						<div className="text-center">
							<p className="text-sm text-gray-500">Streak</p>
							<p className="text-xl font-semibold text-gray-800">{userStats.streak}</p>
						</div>
						<div className="text-center">
							<p className="text-sm text-gray-500">Daily Streak</p>
							<p className="text-xl font-semibold text-gray-800">{userStats.dailyChallengeStreak}</p>
						</div>
					</div>
					<div>
						<p className="text-sm text-gray-500 mb-2">Progress to Level {nextLevel}</p>
						<Progress value={progressToNextLevel} className="w-full h-3" />
					</div>
				</div>

				{/* Achievements section */}
				<div className="space-y-4 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
					<h3 className="text-xl font-bold text-gray-800 flex items-center">
						<Star className="mr-2 text-yellow-500 h-5 w-5" /> New Achievements
					</h3>
					{newAchievements.length > 0 ? (
						<ul className="space-y-2">
							{newAchievements.map((achievement, index) => (
								<li key={index} className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
									<div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
										<Star className="h-4 w-4 text-purple-600" />
									</div>
									<span className="text-purple-700 font-medium">{achievementNames[achievement] || achievement}</span>
								</li>
							))}
						</ul>
					) : (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<Star className="h-8 w-8 text-gray-400" />
							</div>
							<p className="text-gray-600">No new achievements this time.</p>
							<p className="text-sm text-gray-500 mt-1">Keep playing to earn more!</p>
						</div>
					)}
				</div>
			</div>

			{/* Leaderboard section */}
			<div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
				{newLeaderboardEnabled ? (
					<NewLeaderboard />
				) : (
					<>
						<h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
							<Zap className="mr-2 text-yellow-500 h-5 w-5" /> Leaderboard
						</h2>
						<div className="space-y-4">
							{leaderboard.map((entry, index) => (
								<div key={index} className="p-4 bg-gray-50 rounded-xl">
									<div className="flex justify-between items-center mb-2">
										<span className="text-lg font-semibold text-gray-800 truncate pr-2">
											#{index + 1} {entry.name}
										</span>
										<span className="text-sm text-gray-500 shrink-0">{entry.correctAnswers.reduce((sum, count) => sum + count, 0)} correct</span>
									</div>
									<div className="flex space-x-1 overflow-x-auto">
										{entry.correctAnswers.map((count, dayIndex) => (
											<div key={dayIndex} className="h-4 w-4 bg-purple-600 shrink-0 rounded-sm" style={{ opacity: count > 0 ? 1 : 0.2 }} title={`Day ${dayIndex + 1}: ${count} correct`} />
										))}
									</div>
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
