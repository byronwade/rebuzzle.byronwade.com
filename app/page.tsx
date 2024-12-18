import { Metadata } from "next";
import GameBoard from "@/components/GameBoard";
import Layout from "@/components/Layout";
import { fetchGameData } from "@/app/actions/gameActions";

export const metadata: Metadata = {
	title: "Rebuzzle - Daily Rebus Puzzle Challenge",
	description: "Challenge your mind with Rebuzzle's daily rebus puzzle. Solve visual word puzzles and compete with friends!",
	keywords: ["rebus", "puzzle", "word game", "daily challenge", "brain teaser"],
	openGraph: {
		title: "Rebuzzle - Daily Rebus Puzzle Challenge",
		description: "Challenge your mind with Rebuzzle's daily rebus puzzle. Solve visual word puzzles and compete with friends!",
		url: "https://rebuzzle.com",
		siteName: "Rebuzzle",
		images: [
			{
				url: "https://rebuzzle.com/og-image.jpg",
				width: 1200,
				height: 630,
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Rebuzzle - Daily Rebus Puzzle Challenge",
		description: "Challenge your mind with Rebuzzle's daily rebus puzzle. Solve visual word puzzles and compete with friends!",
		images: ["https://rebuzzle.com/twitter-image.jpg"],
	},
	alternates: {
		canonical: "https://rebuzzle.com",
	},
};

export default async function Home() {
	try {
		const gameData = await fetchGameData();

		return (
			<Layout>
				<h1 className="sr-only">Rebuzzle - Daily Rebus Puzzle Challenge</h1>
				<GameBoard initialPuzzle={gameData} />
			</Layout>
		);
	} catch (error) {
		console.error("Failed to load game data:", error);
		return (
			<Layout>
				<div className="text-center">
					<h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h1>
					<p className="text-gray-600">We're having trouble loading today's puzzle. Please try again later.</p>
				</div>
			</Layout>
		);
	}
}
