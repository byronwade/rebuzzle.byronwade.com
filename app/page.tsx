import type { Metadata, Viewport } from "next";
import GameBoard from "@/components/GameBoard";
import Layout from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { fetchGameData, isPuzzleCompletedForToday } from "./actions/gameActions";
import { redirect } from "next/navigation";
import type { GameData } from "@/lib/gameSettings";

export const metadata: Metadata = {
	title: "Rebuzzle - Daily Rebus Puzzle Game",
	description: "Challenge yourself with our daily rebus puzzle. A new puzzle every day!",
	keywords: ["rebus", "puzzle", "daily puzzle", "word game", "brain teaser"],
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
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
					<div className="py-12 text-center fade-in-up">
						<div className="mb-6">
							<div className="text-6xl mb-4">🧩</div>
							<h1 className="mb-4 text-3xl font-bold text-gray-700">No Puzzle Available</h1>
							<p className="text-gray-600 mb-6">Check back later for today's puzzle!</p>
							<LoadingSpinner text="Loading new puzzle..." />
						</div>
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
				<div className="py-12 text-center fade-in-up">
					<div className="mb-6">
						<div className="text-6xl mb-4">😅</div>
						<h1 className="mb-4 text-3xl font-bold text-red-600">Oops! Something went wrong</h1>
						<p className="text-gray-600 mb-6">We're having trouble loading today's puzzle. Please try refreshing the page.</p>
						<button onClick={() => window.location.reload()} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 interactive-element">
							Try Again
						</button>
					</div>
				</div>
			</Layout>
		);
	}
}
