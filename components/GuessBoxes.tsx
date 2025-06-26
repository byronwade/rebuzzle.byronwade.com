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

	return (
		<div className="space-y-6">
			{/* Modern word input display */}
			<div className="space-y-4">
				{wordStructures.map(({ word, structure }, wordIndex) => (
					<div key={wordIndex} className="flex flex-wrap justify-center gap-2 p-4 bg-white backdrop-blur-sm rounded-2xl border border-gray-100" style={{ animationDelay: `${wordIndex * 100}ms` }}>
						{structure.map((item, charIndex) => {
							const globalIndex = wordStructures.slice(0, wordIndex).reduce((acc, { structure }) => acc + structure.length, 0) + charIndex;
							const currentLetter = currentGuess[globalIndex] || "";
							const isCorrect = gameOver && item.char.toLowerCase() === currentLetter.toLowerCase();
							const isIncorrect = gameOver && currentLetter && item.char.toLowerCase() !== currentLetter.toLowerCase();
							const isEmpty = !currentLetter;
							const isActive = globalIndex === currentGuess.length && !gameOver;

							return (
								<div
									key={`${wordIndex}-${charIndex}`}
									className={cn("relative flex items-center justify-center font-bold text-center transition-all duration-300", "w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl", "rounded-xl border-2 shadow-sm", {
										// Correct state
										"bg-green-100 border-green-400 text-green-800 shadow-green-200/50": isCorrect,
										// Incorrect state
										"bg-red-100 border-red-400 text-red-800 shadow-red-200/50": isIncorrect,
										// Empty state
										"bg-white border-gray-200 text-gray-400 hover:border-purple-300": isEmpty && !gameOver,
										// Filled state
										"bg-purple-50 border-purple-300 text-purple-800": !isEmpty && !gameOver,
										// Active state
										"ring-2 ring-purple-400 ring-opacity-50": isActive,
										// Hover effects
										"hover:scale-105 hover:shadow-md": !gameOver,
									})}
								>
									<span className="select-none">{currentLetter.toUpperCase() || ""}</span>

									{/* Active indicator */}
									{isActive && <div className="absolute inset-0 bg-purple-100/50 rounded-xl animate-pulse" />}

									{/* Success animation */}
									{isCorrect && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-bounce" />}
								</div>
							);
						})}
					</div>
				))}
			</div>

			{/* Helpful instruction */}
			<div className="text-center">
				<p className="text-sm text-gray-500 bg-white px-4 py-2 rounded-full inline-block">💡 Type your answer or use the keyboard below</p>
			</div>
		</div>
	);
}
