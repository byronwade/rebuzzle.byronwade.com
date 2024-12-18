import { Metadata, Viewport } from "next";
import GameBoard from "@/components/GameBoard";
import Layout from "@/components/Layout";
import { fetchGameData, isPuzzleCompletedForToday } from "./actions/gameActions";
import { redirect } from "next/navigation";
import { GameData } from "@/lib/gameSettings";

export const metadata: Metadata = {
	title: "Rebuzzle - Daily Rebus Puzzle Game",
	description: "Challenge yourself with our daily rebus puzzle. A new puzzle every day!",
	keywords: ["rebus", "puzzle", "daily puzzle", "word game", "brain teaser"],
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};

interface SearchParams {
	preview?: string;
	test?: string;
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
	const nextjs15 = await searchParams;
	const params = {
		preview: nextjs15?.preview === "true",
		test: nextjs15?.test === "true",
	};

	try {
		// Check if the puzzle is completed for today
		const isCompleted = await isPuzzleCompletedForToday();
		console.log("Puzzle completion state:", isCompleted);

		// Fetch game data
		const gameData = await fetchGameData(params.preview, isCompleted);

		// Handle redirection for completed puzzles
		if (gameData.shouldRedirect) {
			redirect("/game-over");
		}

		// Handle no puzzle available
		if (!gameData.rebusPuzzle) {
			console.log("No puzzle available");
			return (
				<Layout>
					<div className="py-8 text-center">
						<h1 className="mb-4 text-3xl font-bold">No Puzzle Available</h1>
						<p>Check back later for today's puzzle!</p>
					</div>
				</Layout>
			);
		}

		console.log("Rendering game board with data:", {
			id: gameData.id,
			hasRebusPuzzle: !!gameData.rebusPuzzle,
			isCompleted: gameData.isCompleted,
			shouldRedirect: gameData.shouldRedirect,
		});

		return (
			<Layout>
				<GameBoard gameData={gameData} />
			</Layout>
		);
	} catch (error) {
		console.error("Error in Home page:", error);
		return (
			<Layout>
				<div className="py-8 text-center">
					<h1 className="mb-4 text-3xl font-bold">Something went wrong</h1>
					<p>Please try again later.</p>
				</div>
			</Layout>
		);
	}
}
