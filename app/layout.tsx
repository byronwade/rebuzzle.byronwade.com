import { Inter } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: {
		default: "Rebuzzle - Daily Rebus Puzzle Game",
		template: "%s | Rebuzzle",
	},
	description: "Challenge your mind with Rebuzzle, a daily rebus puzzle game. Solve visual word puzzles and compete with friends!",
	keywords: ["rebus", "puzzle", "word game", "daily challenge", "brain teaser"],
	authors: [{ name: "Rebuzzle Team" }],
	creator: "Rebuzzle Team",
	publisher: "Rebuzzle",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://rebuzzle.com",
		siteName: "Rebuzzle",
		title: "Rebuzzle - Daily Rebus Puzzle Game",
		description: "Challenge your mind with Rebuzzle, a daily rebus puzzle game. Solve visual word puzzles and compete with friends!",
		images: [
			{
				url: "https://rebuzzle.com/og-image.jpg",
				width: 1200,
				height: 630,
				alt: "Rebuzzle - Daily Rebus Puzzle Game",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Rebuzzle - Daily Rebus Puzzle Game",
		description: "Challenge your mind with Rebuzzle, a daily rebus puzzle game. Solve visual word puzzles and compete with friends!",
		images: ["https://rebuzzle.com/twitter-image.jpg"],
		creator: "@rebuzzle",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon-16x16.png",
		apple: "/apple-touch-icon.png",
	},
	manifest: "/site.webmanifest",
	alternates: {
		canonical: "https://rebuzzle.com",
		languages: {
			"en-US": "https://rebuzzle.com",
		},
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
					{children}
					<Analytics />
				</body>
			</html>
		</ClerkProvider>
	);
}
