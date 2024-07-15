import React, { createContext, useState, useEffect } from "react";

const GameContext = createContext();

export const GameProvider = ({ children, initialData }) => {
	const [gameData, setGameData] = useState(initialData);
	const [feedback, setFeedback] = useState(""); // Initialize feedback as an empty string
	const [attemptsLeft, setAttemptsLeft] = useState(3);
	const [gameOver, setGameOver] = useState(false);

	useEffect(() => {
		if (!initialData) {
			fetchGameData();
		}
	}, [initialData]);

	const fetchGameData = async () => {
		try {
			const response = await fetch("/api/puzzle", {
				headers: {
					"Cache-Control": "no-store",
				},
			});
			const data = await response.json();
			setGameData(data);
			setGameOver(false);
			setFeedback(""); // Reset feedback to an empty string
			setAttemptsLeft(3);
		} catch (error) {
			console.error("Error fetching game data:", error);
		}
	};

	return (
		<GameContext.Provider
			value={{
				gameData,
				setGameData,
				feedback, // Provide feedback as part of the context value
				setFeedback, // Allow components to update feedback
				attemptsLeft,
				setAttemptsLeft,
				gameOver,
				setGameOver,
			}}
		>
			{children}
		</GameContext.Provider>
	);
};

export default GameContext;
