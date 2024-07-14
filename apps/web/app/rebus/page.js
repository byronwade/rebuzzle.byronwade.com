// pages/rebus.js
"use client";
import Game from "@/components/game";
import Header from "@/components/header";
import Achievements from "@/components/Achievements";
import Leaderboard from "@/components/Leaderboard";
import { useUser } from "@/context/UserContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Import useRouter from Next.js

const App = () => {
	const router = useRouter(); // Initialize useRouter

	const { user, loading, error } = useUser();

	useEffect(() => {
		if (!loading && !user) {
			const isGuest = new URLSearchParams(window.location.search).get("guest") === "true";
			if (!isGuest) {
				router.replace("/login"); // Redirect to login page if not authenticated and not a guest
			}
		}
	}, [loading, user, router]);

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="mb-8">
			<Header />
			<Game />
			{!loading && !user && (
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
			{!loading && user && (
				<>
					<Achievements userId={user.id} />
					<Leaderboard />
				</>
			)}
		</div>
	);
};

export default App;
