"use client";
import "@/styles/globals.css";
import { Inter as FontSans } from "next/font/google";
import { ThemeProvider } from "@/components/themeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GameProvider } from "@/context/GameContext";
import { UserProvider } from "@/context/UserContext";
import { KeyboardProvider } from "@/context/KeyboardContext";
import { cn } from "@/lib/utils";
import { GoogleTagManager } from "@next/third-parties/google"; // Import GoogleTagManager

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

const GTM_ID = "GTM-XYZ"; // Replace with your GTM ID
const GA_ID = "G-FX184YC75H"; // Replace with your GA ID

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
			</head>
			<body className={cn("min-h-screen bg-white dark:bg-black font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
				<GoogleTagManager gtmId={GTM_ID} />
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
