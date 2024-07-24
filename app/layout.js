import "@/styles/globals.css";
import { Inter as FontSans } from "next/font/google";
import { ThemeProvider } from "@/components/utility/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GameProvider } from "@/context/GameContext";
import { UserProvider } from "@/context/UserContext";
import { KeyboardProvider } from "@/context/KeyboardContext";
import { cn } from "@/lib/utils";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google"; // Import GoogleTagManager

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

function addGameJsonLd() {
	return {
		__html: `{
			"@context": "https://schema.org/",
			"@type": "Game",
			"name": "Rebuzzle",
			"description": "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
			"url": "https://rebuzzle.vercel.app",
			"applicationCategory": "Game",
			"operatingSystem": "WEB",
			"image": "https://rebuzzle.vercel.app/logo.png",
			"version": "0.0.5",
			"author": {
				"@type": "Organization",
				"name": "Wade's Inc"
			}
		}`,
	};
}
const GTM_ID = "GTM-XYZ"; // Replace with your GTM ID
const GA_ID = "G-FX184YC75H"; // Replace with your GA ID

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
				<script type="application/ld+json" dangerouslySetInnerHTML={addGameJsonLd()} key="game-jsonld" />
			</head>
			<body className={cn("min-h-screen bg-white dark:bg-black font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
				<GoogleTagManager gtmId={GTM_ID} />
				<GoogleAnalytics gaId={GA_ID} />
				<UserProvider>
					<GameProvider>
						<KeyboardProvider>
							<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
								{children}
							</ThemeProvider>
							<Analytics />
							<SpeedInsights />
						</KeyboardProvider>
					</GameProvider>
				</UserProvider>
			</body>
		</html>
	);
}

// Export metadata for SEO
export const metadata = {
	title: "Rebuzzle - Daily Rebus Puzzle Game",
	description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
	keywords: "Rebuzzle, rebus puzzles, daily puzzles, brain games, puzzle game, mind games",
	openGraph: {
		type: "website",
		url: "https://rebuzzle.vercel.app/",
		title: "Rebuzzle - Daily Rebus Puzzle Game",
		description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
		image: "https://rebuzzle.vercel.app/logo.png",
	},
	twitter: {
		card: "summary_large_image",
		url: "https://rebuzzle.vercel.app/",
		title: "Rebuzzle - Daily Rebus Puzzle Game",
		description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
		image: "https://rebuzzle.vercel.app/logo.png",
	},
	icons: {
		icon: "/favicon.ico",
		appleTouchIcon: "/apple-touch-icon.png",
		favicon32x32: "/favicon-32x32.png",
		favicon16x16: "/favicon-16x16.png",
		manifest: "/site.webmanifest",
	},
};