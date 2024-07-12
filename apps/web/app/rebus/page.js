"use client";
import React, { useState, useEffect } from "react";
import Game from "@/components/game";
import Header from "@/components/header";

// Server-side fetching function
async function fetchPuzzleData() {
	const res = await fetch(`/api/puzzle`, { cache: "no-store" });
	if (!res.ok) {
		throw new Error("Failed to fetch puzzle data");
	}
	return res.json();
}

const App = () => {
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
		};

		updateGameData();

		const interval = setInterval(updateGameData, 24 * 60 * 60 * 1000); // Update at midnight

		return () => clearInterval(interval); // Clean up the interval on component unmount
	}, []);

	if (!currentGameData) return <div>Loading...</div>;

	const settings = {
		attempts: 4,
	};

	return (
		<div className="mb-8">
			<Header />
			<Game gameData={currentGameData} settings={settings} />
		</div>
	);
};

export default App;
