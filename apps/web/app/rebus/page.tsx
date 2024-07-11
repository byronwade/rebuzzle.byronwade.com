"use client";
import React, { useState, useEffect } from "react";
import Game from "@/components/game";
import Header from "@/components/header";

const gameDataList = [
	{
		phrase: "Travel Oversea's",
		image: "/rebus.png",
		explanation: "Travel Oversea's means traveling over the sea. The apostrophe indicates possessive or a contraction, suggesting something like 'Travel oversea is'. The visual clue of the word 'Travel' over multiple 'C's (or seas) indicates a journey over the seas.",
	},
	{
		phrase: "Piece of Cake",
		image: "/pieceofcake.png",
		explanation: "Piece of Cake means something easy to do. The visual clue of a slice of cake emphasizes the ease of the task.",
	},
	// Add more game data objects here
];

const settings = {
	attempts: 4,
};

const App: React.FC = () => {
	const [currentGameData, setCurrentGameData] = useState(gameDataList[0]);

	useEffect(() => {
		const updateGameData = () => {
			const now = new Date();
			const dayOfYear = Math.floor((Number(now) - Number(new Date(now.getFullYear(), 0, 0))) / 1000 / 60 / 60 / 24);
			const gameDataIndex = dayOfYear % gameDataList.length;
			setCurrentGameData(gameDataList[gameDataIndex]);
		};

		updateGameData();

		const interval = setInterval(updateGameData, 24 * 60 * 60 * 1000); // Update at midnight

		return () => clearInterval(interval); // Clean up the interval on component unmount
	}, []);

	return (
		<div className="mb-8">
			<Header />
			<Game gameData={currentGameData} settings={settings} />
		</div>
	);
};

export default App;
