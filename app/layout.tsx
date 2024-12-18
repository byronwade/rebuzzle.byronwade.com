import { Inter } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { AuthCheck } from "@/components/AuthCheck";
import { AuthProvider } from "@/components/AuthProvider";
import { Suspense } from "react";

// Optimize font loading
const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	preload: true,
	fallback: ["system-ui", "arial"],
});

// Pre-compute metadata
export const metadata: Metadata = {
	metadataBase: new URL("https://rebuzzle.com"),
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
				url: "/og-image.jpg",
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
		images: ["/twitter-image.jpg"],
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
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/icon.svg", type: "image/svg+xml" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
		<ClerkProvider appearance={{ layout: { logoPlacement: "none" } }} publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
			<html lang="en" suppressHydrationWarning>
				<head>
					<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
					<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
					<link rel="icon" href="/icon.svg" type="image/svg+xml" />
					<link rel="apple-touch-icon" href="/icon-192.png" />
					<Suspense fallback={null}>
						<AuthCheck />
					</Suspense>
				</head>
				<body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
					<AuthProvider>
						<Suspense fallback={null}>{children}</Suspense>
					</AuthProvider>
					<Analytics debug={process.env.NODE_ENV === "development"} />
				</body>
			</html>
		</ClerkProvider>
	);
}
