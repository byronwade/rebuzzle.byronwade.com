import { Inter } from "next/font/google";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";

// Optimize font loading
const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	preload: true,
	fallback: ["system-ui", "arial"],
	adjustFontFallback: false, // Prevent unused preload warning
});

// Enhanced viewport configuration for mobile
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#8b5cf6" },
		{ media: "(prefers-color-scheme: dark)", color: "#8b5cf6" },
	],
};

// Pre-compute metadata with mobile-optimized PWA settings
export const metadata: Metadata = {
	metadataBase: new URL("https://rebuzzle.com"),
	title: {
		default: "Rebuzzle - Daily Rebus Puzzle Game",
		template: "%s | Rebuzzle",
	},
	description: "Challenge your mind with Rebuzzle, a daily rebus puzzle game. Solve visual word puzzles and compete with friends!",
	keywords: ["rebus", "puzzle", "word game", "daily challenge", "brain teaser", "mobile game", "PWA"],
	authors: [{ name: "Rebuzzle Team" }],
	creator: "Rebuzzle Team",
	publisher: "Rebuzzle",
	applicationName: "Rebuzzle",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Rebuzzle",
		startupImage: [
			{
				url: "/apple-splash-2048-2732.png",
				media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
			},
			{
				url: "/apple-splash-1668-2224.png",
				media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
			},
			{
				url: "/apple-splash-1536-2048.png",
				media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
			},
			{
				url: "/apple-splash-1125-2436.png",
				media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
			},
			{
				url: "/apple-splash-1242-2208.png",
				media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
			},
			{
				url: "/apple-splash-750-1334.png",
				media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
			},
			{
				url: "/apple-splash-640-1136.png",
				media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
			},
		],
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
			{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
		shortcut: [{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
	},
	manifest: "/manifest.json",
	alternates: {
		canonical: "https://rebuzzle.com",
		languages: {
			"en-US": "https://rebuzzle.com",
		},
	},
	other: {
		"mobile-web-app-capable": "yes",
		"apple-mobile-web-app-capable": "yes",
		"apple-mobile-web-app-status-bar-style": "default",
		"apple-mobile-web-app-title": "Rebuzzle",
		"application-name": "Rebuzzle",
		"msapplication-TileColor": "#8b5cf6",
		"msapplication-config": "/browserconfig.xml",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Preconnect to external resources */}
				<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

				{/* Mobile-optimized icons */}
				<link rel="icon" href="/icon.svg" type="image/svg+xml" />
				<link rel="icon" href="/icon-192x192.png" sizes="192x192" type="image/png" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
				<link rel="shortcut icon" href="/icon-192x192.png" />

				{/* PWA manifest */}
				<link rel="manifest" href="/manifest.json" />

				{/* iOS specific meta tags */}
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Rebuzzle" />

				{/* Android specific meta tags */}
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="application-name" content="Rebuzzle" />

				{/* Microsoft specific meta tags */}
				<meta name="msapplication-TileColor" content="#8b5cf6" />
				<meta name="msapplication-TileImage" content="/icon-192x192.png" />

				{/* Notification permission hint for mobile */}
				<meta name="notification-permission" content="granted" />
			</head>
			<body className={`${inter.className} min-h-screen bg-background font-sans antialiased overflow-x-hidden`}>
				<AuthProvider>
					<Suspense fallback={null}>{children}</Suspense>
					<Toaster />
				</AuthProvider>
			</body>
		</html>
	);
}
