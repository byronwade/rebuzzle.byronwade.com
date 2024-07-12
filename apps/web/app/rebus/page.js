"use client";
import React, { useState, useEffect, useContext } from "react";
import Game from "@/components/game";
import Header from "@/components/header";
import { GameProvider } from "@/context/GameContext";
import GameContext from "@/context/GameContext";

// Server-side fetching function
async function fetchPuzzleData() {
	const res = await fetch(`/api/puzzle`, { cache: "no-store" });
	if (!res.ok) {
		throw new Error("Failed to fetch puzzle data");
	}
	return res.json();
}

const App = () => {
	const { setGameData } = useContext(GameContext);
	const [currentGameData, setCurrentGameData] = useState(null);

	useEffect(() => {
		const updateGameData = async () => {
			const data = await fetchPuzzleData();
			const gameData = {
				phrase: data.solution,
				image: data.image_url,
				explanation: data.explanation,
			};
			setCurrentGameData(gameData);
			setGameData(gameData);
		};

		updateGameData();

		const interval = setInterval(updateGameData, 24 * 60 * 60 * 1000); // Update at midnight

		return () => clearInterval(interval); // Clean up the interval on component unmount
	}, [setGameData]);

	if (!currentGameData) return <div>Loading...</div>;

	return (
		<div className="mb-8">
			<Header />
			<Game gameData={currentGameData} />
		</div>
	);
};

export default App;
