'use client'

import { cn } from '@/lib/utils'
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
		<Button variant="outline" size="sm" onClick={() => onPress(letter)} disabled={disabled} className="w-10 h-12 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95">
			{letter}
		</Button>
	);
}

export function Keyboard({ onKeyPress, disabled }: KeyboardProps) {
	return (
		<div className="w-full max-w-2xl mx-auto p-4 space-y-3">
			{/* First row */}
			<div className="flex justify-center gap-1.5">
				{["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((letter) => (
					<KeyButton key={letter} letter={letter} onPress={onKeyPress} disabled={disabled} />
				))}
			</div>

			{/* Second row */}
			<div className="flex justify-center gap-1.5">
				{["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((letter) => (
					<KeyButton key={letter} letter={letter} onPress={onKeyPress} disabled={disabled} />
				))}
			</div>

			{/* Third row */}
			<div className="flex justify-center gap-1.5">
				<Button variant="outline" size="sm" onClick={() => onKeyPress("Backspace")} disabled={disabled} className="h-12 px-4 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
					⌫
				</Button>
				{["Z", "X", "C", "V", "B", "N", "M"].map((letter) => (
					<KeyButton key={letter} letter={letter} onPress={onKeyPress} disabled={disabled} />
				))}
				<Button variant="outline" size="sm" onClick={() => onKeyPress("Enter")} disabled={disabled} className="h-12 px-4 bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
					↵
				</Button>
			</div>

			{/* Space bar */}
			<div className="flex justify-center">
				<Button variant="outline" onClick={() => onKeyPress(" ")} disabled={disabled} className="h-12 px-16 bg-white hover:bg-gray-50 border-gray-200 text-gray-600 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
					Space
				</Button>
			</div>
		</div>
	);
}

