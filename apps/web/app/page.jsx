// pages/index.js
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Head from "next/head";

function Home() {
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
				<script type="application/ld+json" dangerouslySetInnerHTML={addGameJsonLd()} key="game-jsonld" />
			</Head>
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-6xl font-bold">Rebuzzle</h1>
					<p className="text-gray-500 mb-4">Rebus Puzzles</p>
					<p className="text-lg mb-8">Unravel the Picture, Reveal the Phrase!</p>
					<div className="space-x-4">
						<Link href="/rebus?guest=true">
							<Button variant="secondary">Play as Guest</Button>
						</Link>
						<Link href="/rebus">
							<Button variant="success">Play Logged In</Button>
						</Link>
					</div>
					<div className="space-x-4 mt-4">
						<Link href="/signup">
							<Button>Signup</Button>
						</Link>
					</div>
					<p className="text-gray-500 mt-4">{gameVersion}</p>
				</div>
			</div>
		</>
	);
}

export default Home;

// Export metadata for SEO
export const metadata = {
	title: "Rebuzzle - Daily Rebus Puzzle Game",
	description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
	keywords: "Rebuzzle, rebus puzzles, daily puzzles, brain games, puzzle game, mind games",
	openGraph: {
		type: "website",
		url: "https://yourdomain.com/",
		title: "Rebuzzle - Daily Rebus Puzzle Game",
		description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
		image: "https://yourdomain.com/images/rebuzzle-og-image.jpg",
	},
	twitter: {
		card: "summary_large_image",
		url: "https://yourdomain.com/",
		title: "Rebuzzle - Daily Rebus Puzzle Game",
		description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
		image: "https://yourdomain.com/images/rebuzzle-twitter-image.jpg",
	},
	icons: {
		icon: "/favicon.ico",
		appleTouchIcon: "/apple-touch-icon.png",
		favicon32x32: "/favicon-32x32.png",
		favicon16x16: "/favicon-16x16.png",
		manifest: "/site.webmanifest",
	},
};