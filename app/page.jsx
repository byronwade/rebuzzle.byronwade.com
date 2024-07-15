"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { trackEvent } from "@/lib/gtag";
import { useRouter } from "next/router";

function Home() {
	const gameVersion = "No. 0005";
	const router = useRouter();

	useEffect(() => {
		const handleRouteChange = (url) => {
			trackEvent({
				action: "page_view",
				category: "Page",
				label: url,
			});
		};

		router.events.on("routeChangeComplete", handleRouteChange);
		return () => {
			router.events.off("routeChangeComplete", handleRouteChange);
		};
	}, [router.events]);

	const handleButtonClick = (action, label) => {
		trackEvent({
			action: action,
			category: "Button",
			label: label,
		});
	};

	return (
		<>
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-6xl font-bold">Rebuzzle</h1>
					<p className="text-gray-500 mb-4">Rebus Puzzles</p>
					<p className="text-lg mb-8">Unravel the Picture, Reveal the Phrase!</p>
					<div className="space-x-4">
						<Link href="/rebus?guest=true">
							<Button variant="brand" onClick={() => handleButtonClick("click", "Play as Guest")}>
								Play as Guest
							</Button>
						</Link>
						<Link href="/login">
							<Button onClick={() => handleButtonClick("click", "Play Logged In")}>Play Logged In</Button>
						</Link>
					</div>
					<div className="space-x-4 mt-4">
						<Link href="/signup">
							<Button variant="secondary" onClick={() => handleButtonClick("click", "Signup")}>
								Signup
							</Button>
						</Link>
					</div>
					<p className="text-gray-500 mt-4">{gameVersion}</p>
					<p className="text-gray-500 mt-4">Made By Byron Wade</p>
				</div>
			</div>
		</>
	);
}

export default Home;
