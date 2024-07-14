// pages/index.js
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Head from "next/head";

export default function Home() {
	const gameVersion = "v1.0.0"; // Update this with the actual version

	function addGameJsonLd() {
		return {
			__html: `{
				"@context": "https://schema.org/",
				"@type": "Game",
				"name": "Rebuzzle",
				"description": "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
				"url": "https://yourdomain.com/",
				"applicationCategory": "Game",
				"operatingSystem": "WEB",
				"image": "https://yourdomain.com/images/rebuzzle-og-image.jpg",
				"version": "${gameVersion}",
				"author": {
					"@type": "Organization",
					"name": "Your Company"
				}
			}`,
		};
	}

	return (
		<>
			<Head>
				<title>Rebuzzle - Daily Rebus Puzzle Game</title>
				<meta name="description" content="Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!" key="desc" />
				<meta name="keywords" content="Rebuzzle, rebus puzzles, daily puzzles, brain games, puzzle game, mind games" />
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

				{/* Open Graph / Facebook */}
				<meta property="og:type" content="website" />
				<meta property="og:url" content="https://yourdomain.com/" />
				<meta property="og:title" content="Rebuzzle - Daily Rebus Puzzle Game" />
				<meta property="og:description" content="Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!" />
				<meta property="og:image" content="https://yourdomain.com/images/rebuzzle-og-image.jpg" />

				{/* Twitter */}
				<meta property="twitter:card" content="summary_large_image" />
				<meta property="twitter:url" content="https://yourdomain.com/" />
				<meta property="twitter:title" content="Rebuzzle - Daily Rebus Puzzle Game" />
				<meta property="twitter:description" content="Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!" />
				<meta property="twitter:image" content="https://yourdomain.com/images/rebuzzle-twitter-image.jpg" />

				{/* Favicon */}
				<link rel="icon" href="/favicon.ico" />
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="manifest" href="/site.webmanifest" />

				{/* JSON-LD Structured Data */}
				<script type="application/ld+json" dangerouslySetInnerHTML={addGameJsonLd()} key="game-jsonld" />
			</Head>
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<div className="text-center">
					<h1 className="text-6xl font-bold">Rebuzzle</h1>
					<p className="text-gray-500 mb-4">Rebus Puzzles</p>
					<p className="text-lg mb-8">Unravel the Picture, Reveal the Phrase!</p>
					<div className="space-x-4">
						<Link href="/rebus?guest=true">
							<Button className="bg-gray-700 text-white px-4 py-2 rounded-md">Play as Guest</Button>
						</Link>
						<Link href="/rebus">
							<Button className="bg-green-700 text-white px-4 py-2 rounded-md">Play Logged In</Button>
						</Link>
					</div>
					<div className="space-x-4 mt-4">
						<Link href="/signup">
							<Button className="bg-black text-white px-4 py-2 rounded-md">Signup</Button>
						</Link>
					</div>
					<p className="text-gray-500 mt-4">{gameVersion}</p>
				</div>
			</div>
		</>
	);
}
