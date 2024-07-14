"use client";
import Game from "@/components/game";
import Header from "@/components/header";
import Leaderboard from "@/components/Leaderboard";
import { useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const App = () => {
	const router = useRouter();
	const { user, loading, error } = useUser();
	const [isGuest, setIsGuest] = useState(false);

	useEffect(() => {
		if (!loading && !user) {
			const guestParam = new URLSearchParams(window.location.search).get("guest") === "true";
			setIsGuest(guestParam);
			if (!guestParam) {
				router.replace("/rebus?guest=true");
			}
		}
	}, [loading, user, router]);

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="relative mb-8">
			<Header />
			<Game />
			{!loading && !user && !isGuest && (
				<div className="text-center mt-4">
					<p>You need to log in to access this page.</p>
					<p>
						Please{" "}
						<a href="/login" className="text-blue-500">
							log in
						</a>{" "}
						or{" "}
						<a href="/" className="text-blue-500">
							go back
						</a>{" "}
						to the homepage.
					</p>
				</div>
			)}
			{!loading && (user || isGuest) && (
				<>
					<div className="absolute top-10 right-10 mt-16 ml-4">
						<Leaderboard />
					</div>
				</>
			)}
		</div>
	);
};

export default App;
