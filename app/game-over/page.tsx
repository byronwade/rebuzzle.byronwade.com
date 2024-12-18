import { Metadata } from "next";
import GameOverContent from "@/components/GameOverContent";
import { Confetti } from "@/components/Confetti";
import { cookies } from "next/headers";
import { gameSettings } from "@/lib/gameSettings";
import Layout from "@/components/Layout";
import { UserStats } from "@/lib/gamification";
import { fetchGameData } from "../actions/gameActions";
import { fetchUserStats } from "../actions/gamificationActions";

export const metadata: Metadata = {
	title: "Game Over - Rebuzzle Results",
	description: "See how you performed in today's Rebuzzle challenge. Check your score, achievements, and compare with others on the leaderboard.",
	alternates: {
		canonical: "https://rebuzzle.com/game-over",
	},
};

export default async function GameOverPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
	const userGuess = typeof searchParams.guess === "string" ? searchParams.guess : "";
	const success = searchParams.success === "true";
	const attempts = typeof searchParams.attempts === "string" ? parseInt(searchParams.attempts, 10) : gameSettings.maxAttempts;

	const gameData = await fetchGameData();
	const userStats = await fetchUserStats("user123"); // Replace 'user123' with actual user ID when implemented

	// Check if the user is logged in
	const cookieStore = cookies();
	const isLoggedIn = cookieStore.has("user_session"); // Replace with your actual session cookie name

	return (
		<Layout>
			{success && <Confetti />}
			<div className="bg-white p-6 rounded-lg shadow-sm">
				<GameOverContent answer={gameData.answer} explanation={gameData.explanation} leaderboard={gameData.leaderboard} success={success} userGuess={userGuess} isLoggedIn={isLoggedIn} userStats={userStats} attempts={attempts} maxAttempts={gameSettings.maxAttempts} />
			</div>
		</Layout>
	);
}
