import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface GuessBoxesProps {
	currentGuess: string;
	answer: string;
	gameOver: boolean;
	lastSubmittedGuess: string | null;
	submittedGuesses: string[];
	onSubmit: () => void;
	isGuessFilled: boolean;
	handleGuess: () => void;
}

interface WordStructure {
	type: "letter" | "punctuation";
	char: string;
}

export function GuessBoxes({ currentGuess, answer, gameOver, lastSubmittedGuess, submittedGuesses, onSubmit, isGuessFilled, handleGuess }: GuessBoxesProps) {
	// Memoize word structure calculation
	const wordStructures = useMemo(() => {
		return answer.split(" ").map((word) => ({
			word,
			structure: word.split("").map((char) => ({
				type: char.match(/[.,!?]/) ? ("punctuation" as const) : ("letter" as const),
				char,
			})),
		}));
	}, [answer]);

	let guessIndex = 0;

	return (
		<div className="flex flex-col items-center gap-4 mb-6">
			{wordStructures.map(({ word, structure }, wordIndex) => (
				<div key={`word-${wordIndex}`} className="flex justify-center gap-1.5">
					{structure.map((item, charIndex) => {
						if (item.type === "punctuation") {
							return (
								<div key={`${wordIndex}-${charIndex}`} className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-base sm:text-lg font-bold text-gray-500">
									{item.char}
								</div>
							);
						}

						const letter = gameOver ? item.char : currentGuess[guessIndex];
						const isCorrect = lastSubmittedGuess && lastSubmittedGuess[guessIndex]?.toLowerCase() === item.char.toLowerCase();
						const isIncorrect = lastSubmittedGuess && lastSubmittedGuess[guessIndex] && lastSubmittedGuess[guessIndex]?.toLowerCase() !== item.char.toLowerCase();

						const box = (
							<div
								key={`${wordIndex}-${charIndex}`}
								className={cn(
									"w-12 h-12 sm:w-14 sm:h-14 rounded flex items-center justify-center text-xl sm:text-2xl font-bold border-2",
									"transform transition-all duration-150 ease-in-out",
									letter && "scale-105",
									gameOver ? "bg-gray-200 text-gray-600 border-gray-300" : letter ? (lastSubmittedGuess ? (isCorrect ? "bg-green-500 text-white border-green-600 animate-bounce-once" : isIncorrect ? "bg-red-500 text-white border-red-600 animate-shake-once" : "bg-purple-100 text-gray-800 border-purple-200") : "bg-purple-100 text-gray-800 border-purple-200") : "bg-white text-gray-800 border-gray-300 hover:border-gray-400",
									"transition-colors duration-200"
								)}
								aria-label={`Letter box ${guessIndex + 1}`}
							>
								{gameOver ? item.char : letter || ""}
							</div>
						);

						guessIndex++;
						return box;
					})}
				</div>
			))}
		</div>
	);
}
