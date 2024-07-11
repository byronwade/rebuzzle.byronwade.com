"use client";
import "@/styles/globals.css";
import { Inter as FontSans } from "next/font/google";
import { ThemeProvider } from "@/components/themeProvider";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "shared-utils";

import { cn } from "@/lib/utils";

type RootLayoutProps = {
	children: React.ReactNode;
};

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<html lang="en">
			<head />
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
				<ApolloProvider client={apolloClient}>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						{children}
					</ThemeProvider>
				</ApolloProvider>
			</body>
		</html>
	);
}
