import { Metadata } from "next";
import GameOverContent from "@/components/GameOverContent";
import { Confetti } from "@/components/Confetti";
import { gameSettings } from "@/lib/gameSettings";
import Layout from "@/components/Layout";
import { UserStats } from "@/lib/gamification";
import { fetchGameData } from "../actions/gameActions";
import { fetchUserStats } from "../actions/gamificationActions";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";

export const metadata: Metadata = {
	title: "Game Over - Rebuzzle Results",
	description: "See how you performed in today's Rebuzzle challenge. Check your score, achievements, and compare with others on the leaderboard.",
	alternates: {
		canonical: "https://rebuzzle.com/game-over",
	},
};

export default async function GameOverPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
	const nextjs15 = await searchParams;
	const userGuess = typeof nextjs15.guess === "string" ? nextjs15.guess : "";
	const success = nextjs15.success === "true";
	const attempts = typeof nextjs15.attempts === "string" ? parseInt(nextjs15.attempts, 10) : gameSettings.maxAttempts;

	const gameData = await fetchGameData();
	const userStats = await fetchUserStats("user123"); // Replace 'user123' with actual user ID when implemented

	return (
		<Layout>
			{success && <Confetti />}
			<div className="p-6 bg-white rounded-lg shadow-sm">
				<SignedIn>
					<GameOverContent answer={gameData.answer} explanation={gameData.explanation} leaderboard={gameData.leaderboard} success={success} userGuess={userGuess} isLoggedIn={true} userStats={userStats} attempts={attempts} maxAttempts={gameSettings.maxAttempts} />
				</SignedIn>
				<SignedOut>
					<GameOverContent answer={gameData.answer} explanation={gameData.explanation} leaderboard={gameData.leaderboard} success={success} userGuess={userGuess} isLoggedIn={false} userStats={userStats} attempts={attempts} maxAttempts={gameSettings.maxAttempts} />
				</SignedOut>
			</div>
		</Layout>
	);
}
