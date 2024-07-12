import React, { createContext, useState, useEffect } from "react";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
	const [gameData, setGameData] = useState(null);
	const [feedback, setFeedback] = useState("");
	const [attemptsLeft, setAttemptsLeft] = useState(3);
	const [gameOver, setGameOver] = useState(false);
	const [hint, setHint] = useState("");
	const [countdown, setCountdown] = useState("00:00:00");

	useEffect(() => {
		// Calculate time remaining until midnight for countdown
		const now = new Date();
		const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
		let countdownTime = timeUntilMidnight;
		setCountdown(formatCountdown(countdownTime));

		const interval = setInterval(() => {
			countdownTime -= 1000;
			setCountdown(formatCountdown(countdownTime));
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const parseTime = (formattedTime) => {
		const [hours, minutes, seconds] = formattedTime.split(":").map(Number);
		return (hours * 3600 + minutes * 60 + seconds) * 1000;
	};

	const formatCountdown = (milliseconds) => {
		const totalSeconds = Math.floor(milliseconds / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours < 0 || minutes < 0 || seconds < 0) {
			return "00:00:00";
		}

		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	};

	const value = {
		gameData,
		setGameData,
		feedback,
		setFeedback,
		attemptsLeft,
		setAttemptsLeft,
		gameOver,
		setGameOver,
		hint,
		setHint,
		countdown,
	};

	return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameContext;
