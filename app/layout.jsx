// app/layout.js
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
import { useGoogleAnalytics } from "@/lib/useGoogleAnalytics";

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

export default function RootLayout({ children }) {
	useGoogleAnalytics();

	return (
		<html lang="en">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
				{/* Global Site Tag (gtag.js) - Google Analytics */}
				<script async src={`https://www.googletagmanager.com/gtag/js?id=G-FX184YC75H`}></script>
				<script
					dangerouslySetInnerHTML={{
						__html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-FX184YC75H', {
                page_path: window.location.pathname,
              });
            `,
					}}
				/>
			</head>
			<body className={cn("min-h-screen bg-white dark:bg-black font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
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
