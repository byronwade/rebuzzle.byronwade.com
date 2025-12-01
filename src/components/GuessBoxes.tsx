"use client";

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

export function GuessBoxes({
  currentGuess,
  answer,
  gameOver,
  lastSubmittedGuess,
  submittedGuesses,
  onSubmit,
  isGuessFilled,
  handleGuess,
}: GuessBoxesProps) {
  // Memoize word structure calculation
  const wordStructures = useMemo(
    () =>
      answer.split(" ").map((word) => ({
        word,
        structure: word.split("").map((char) => ({
          type: char.match(/[.,!?]/)
            ? ("punctuation" as const)
            : ("letter" as const),
          char,
        })),
      })),
    [answer]
  );

  return (
    <div className="space-y-6">
      {/* Modern word input display */}
      <div className="space-y-4">
        {wordStructures.map(({ word, structure }, wordIndex) => (
          <div
            className="flex flex-wrap justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 backdrop-blur-sm"
            key={wordIndex}
            style={{ animationDelay: `${wordIndex * 100}ms` }}
          >
            {structure.map((item, charIndex) => {
              const globalIndex =
                wordStructures
                  .slice(0, wordIndex)
                  .reduce((acc, { structure }) => acc + structure.length, 0) +
                charIndex;
              const currentLetter = currentGuess[globalIndex] || "";
              const isCorrect =
                gameOver &&
                item.char.toLowerCase() === currentLetter.toLowerCase();
              const isIncorrect =
                gameOver &&
                currentLetter &&
                item.char.toLowerCase() !== currentLetter.toLowerCase();
              const isEmpty = !currentLetter;
              const isActive = globalIndex === currentGuess.length && !gameOver;

              return (
                <div
                  className={cn(
                    "relative flex items-center justify-center text-center font-bold transition-all duration-300",
                    "h-12 w-12 text-lg sm:h-14 sm:w-14 sm:text-xl",
                    "rounded-xl border-2 shadow-sm",
                    {
                      // Correct state
                      "border-green-400 bg-green-100 text-green-800 shadow-green-200/50":
                        isCorrect,
                      // Incorrect state
                      "border-red-400 bg-red-100 text-red-800 shadow-red-200/50":
                        isIncorrect,
                      // Empty state
                      "border-gray-200 bg-white text-gray-400 hover:border-purple-300":
                        isEmpty && !gameOver,
                      // Filled state
                      "border-purple-300 bg-purple-50 text-purple-800": !(
                        isEmpty || gameOver
                      ),
                      // Active state
                      "ring-2 ring-purple-400 ring-opacity-50": isActive,
                      // Hover effects
                      "hover:scale-105 hover:shadow-md": !gameOver,
                    }
                  )}
                  key={`${wordIndex}-${charIndex}`}
                >
                  <span className="select-none">
                    {currentLetter.toUpperCase() || ""}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 animate-pulse rounded-xl bg-purple-100/50" />
                  )}

                  {/* Success animation */}
                  {isCorrect && (
                    <div className="-top-1 -right-1 absolute h-3 w-3 animate-bounce rounded-full bg-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Helpful instruction */}
      <div className="text-center">
        <p className="inline-block rounded-full bg-white px-4 py-2 text-gray-500 text-sm">
          💡 Type your answer or use the keyboard below
        </p>
      </div>
    </div>
  );
}
