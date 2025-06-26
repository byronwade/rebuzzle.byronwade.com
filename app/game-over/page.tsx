"use client";

import GameOverContent from "@/components/GameOverContent";
import { Confetti } from "@/components/Confetti";
import { gameSettings } from "@/lib/gameSettings";
import Layout from "@/components/Layout";
import { fetchGameData } from "../actions/gameActions";
import Link from "next/link";
import { useEffect, useState } from "react";

// Demo UserStats type and data
interface UserStats {
	level: number;
	points: number;
	streak: number;
	dailyChallengeStreak: number;
	achievements: string[];
}

const demoUserStats: UserStats = {
	level: 3,
	points: 1250,
	streak: 5,
	dailyChallengeStreak: 3,
	achievements: ["first_win", "streak_3"],
};

interface GameData {
	answer: string;
	explanation: string;
	leaderboard: any[];
}

export default function GameOverPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
	const [params, setParams] = useState<{ [key: string]: string | string[] | undefined }>({});
	const [gameData, setGameData] = useState<GameData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadData() {
			try {
				const resolvedParams = await searchParams;
				setParams(resolvedParams);

				const data = await fetchGameData();
				setGameData(data);
			} catch (error) {
				console.error("Error loading game data:", error);
			} finally {
				setLoading(false);
			}
		}

		loadData();
	}, [searchParams]);

	if (loading || !gameData) {
		return (
			<Layout>
				<div className="min-h-screen bg-slate-50 flex items-center justify-center">
					<div className="text-center">
						<div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-gray-600">Loading results...</p>
					</div>
				</div>
			</Layout>
		);
	}

	const userGuess = typeof params.guess === "string" ? params.guess : "";
	const success = params.success === "true";
	const attempts = typeof params.attempts === "string" ? parseInt(params.attempts, 10) : gameSettings.maxAttempts;

	return (
		<Layout>
			{success && <Confetti />}

			{/* Modern game over container */}
			<div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
				<div className="w-full max-w-4xl">
					{/* Main result card */}
					<div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
						{/* Header section */}
						<div className="bg-purple-50 px-6 py-8 text-center border-b border-purple-100">
							<div className="space-y-4">
								{success ? (
									<>
										<div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
											<svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<h1 className="text-4xl font-bold text-green-600">Congratulations!</h1>
										<p className="text-lg text-gray-600">You solved today's puzzle!</p>
									</>
								) : (
									<>
										<div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
											<svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
										</div>
										<h1 className="text-4xl font-bold text-red-600">Game Over</h1>
										<p className="text-lg text-gray-600">Better luck tomorrow!</p>
									</>
								)}
							</div>
						</div>

						{/* Content section */}
						<div className="p-6 sm:p-8">
							<GameOverContent answer={gameData.answer} explanation={gameData.explanation} leaderboard={gameData.leaderboard} success={success} userGuess={userGuess} isLoggedIn={false} userStats={demoUserStats} attempts={attempts} maxAttempts={gameSettings.maxAttempts} />
						</div>

						{/* Footer actions */}
						<div className="bg-gray-50 px-6 py-6 border-t border-gray-100">
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link href="/" className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors duration-200 shadow-sm hover:shadow-md text-center">
									Play Tomorrow's Puzzle
								</Link>
								<Link href="/blog" className="px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl font-semibold transition-colors duration-200 text-center">
									Read Our Blog
								</Link>
							</div>
						</div>
					</div>

					{/* Additional info */}
					<div className="mt-8 text-center">
						<p className="text-sm text-gray-500">Come back tomorrow for a new puzzle! 🧩</p>
					</div>
				</div>
			</div>
		</Layout>
	);
}
