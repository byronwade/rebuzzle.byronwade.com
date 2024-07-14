"use client";
import "@/styles/globals.css";
import { Inter as FontSans } from "next/font/google";
import { ThemeProvider } from "@/components/themeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GameProvider } from "@/context/GameContext";
import { UserProvider } from "@/context/UserContext";
import { cn } from "@/lib/utils";

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
			</head>
			<body className={cn("min-h-screen bg-white dark:bg-black font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
				<UserProvider>
					<GameProvider>
						<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
							{children}
						</ThemeProvider>
						<Analytics />
						<SpeedInsights />
					</GameProvider>
				</UserProvider>
			</body>
		</html>
	);
}
