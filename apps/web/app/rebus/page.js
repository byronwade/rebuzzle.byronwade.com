"use client";
import Game from "@/components/game";
import Header from "@/components/header";
import Achievements from "@/components/Achievements";
import Leaderboard from "@/components/Leaderboard";
import { GameProvider } from "@/context/GameContext";
import { useUser } from "@/context/UserContext";
import { useEffect } from "react";

const App = () => {
	const { user, loading, error } = useUser();

	useEffect(() => {
		if (!loading && !user) {
			window.location.href = "/login"; // Redirect to login page if not authenticated
		}
	}, [loading, user]);

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<GameProvider>
			<div className="mb-8">
				<Header />
				<Game />
				{user && <Achievements userId={user.id} />}
				<Leaderboard />
			</div>
		</GameProvider>
	);
};

export default App;