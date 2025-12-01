"use client";

import { Button } from "@/components/ui/button";

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  disabled: boolean;
}

interface KeyButtonProps {
  letter: string;
  onPress: (key: string) => void;
  disabled: boolean;
}

function KeyButton({ letter, onPress, disabled }: KeyButtonProps) {
  return (
    <Button
      aria-label={`Press ${letter} key`}
      className="h-12 w-10 rounded-xl border-gray-200 bg-white font-medium text-gray-700 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
      disabled={disabled}
      onClick={() => onPress(letter)}
      size="sm"
      variant="outline"
    >
      {letter}
    </Button>
  );
}

export function Keyboard({ onKeyPress, disabled }: KeyboardProps) {
  return (
    <div
      aria-label="Virtual keyboard"
      className="mx-auto w-full max-w-2xl space-y-3 p-4"
      role="group"
    >
      {/* First row */}
      <div className="flex justify-center gap-1.5">
        {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((letter) => (
          <KeyButton
            disabled={disabled}
            key={letter}
            letter={letter}
            onPress={onKeyPress}
          />
        ))}
      </div>

      {/* Second row */}
      <div className="flex justify-center gap-1.5">
        {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((letter) => (
          <KeyButton
            disabled={disabled}
            key={letter}
            letter={letter}
            onPress={onKeyPress}
          />
        ))}
      </div>

      {/* Third row */}
      <div className="flex justify-center gap-1.5">
        <Button
          aria-label="Backspace"
          className="h-12 rounded-xl border-gray-200 bg-white px-4 font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={disabled}
          onClick={() => onKeyPress("Backspace")}
          size="sm"
          variant="outline"
        >
          <span aria-hidden="true">⌫</span>
        </Button>
        {["Z", "X", "C", "V", "B", "N", "M"].map((letter) => (
          <KeyButton
            disabled={disabled}
            key={letter}
            letter={letter}
            onPress={onKeyPress}
          />
        ))}
        <Button
          aria-label="Enter"
          className="h-12 rounded-xl border-purple-200 bg-purple-100 px-4 font-medium text-purple-700 shadow-sm transition-all duration-200 hover:bg-purple-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={disabled}
          onClick={() => onKeyPress("Enter")}
          size="sm"
          variant="outline"
        >
          <span aria-hidden="true">↵</span>
        </Button>
      </div>

      {/* Space bar */}
      <div className="flex justify-center">
        <Button
          aria-label="Space"
          className="h-12 rounded-xl border-gray-200 bg-white px-16 font-medium text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={disabled}
          onClick={() => onKeyPress(" ")}
          variant="outline"
        >
          Space
        </Button>
      </div>
    </div>
  );
}
