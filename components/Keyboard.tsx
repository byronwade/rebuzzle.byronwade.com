'use client'

import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button";

interface KeyboardProps {
	onKeyPress: (key: string) => void;
	disabled?: boolean;
}

const keyboardLayout = [
	["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
	["A", "S", "D", "F", "G", "H", "J", "K", "L"],
	["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

export function Keyboard({ onKeyPress, disabled }: KeyboardProps) {
	return (
		<div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-1 pb-6 pt-2 sm:static sm:bg-transparent sm:border-0">
			<div className="max-w-3xl mx-auto">
				{keyboardLayout.map((row, rowIndex) => (
					<div key={rowIndex} className="flex justify-center gap-[0.25rem] mb-[0.25rem]">
						{rowIndex === 1 && <div className="flex-[0.5]" />}
						{row.map((key) => {
							const isBackspace = key === "BACKSPACE";
							const isEnter = key === "ENTER";
							return (
								<Button
									key={key}
									onClick={() => !disabled && onKeyPress(key)}
									variant="outline"
									className={cn("h-[3.5rem] sm:h-14 p-0 font-bold transition-colors uppercase", isBackspace ? "px-3 flex-[2.5] sm:flex-[1.5] text-base" : isEnter ? "px-2 flex-[1.5] sm:flex-[1.2] text-xs" : "w-[2.75rem] sm:w-[2.75rem] text-sm", disabled && "opacity-50 cursor-not-allowed", (isBackspace || isEnter) && "bg-gray-100 hover:bg-gray-200/90 active:bg-gray-300/90 text-gray-700", "touch-manipulation select-none")}
									disabled={disabled}
								>
									{isBackspace ? (
										<span className="flex items-center justify-center gap-2">
											<span className="text-lg">←</span>
											<span className="hidden sm:inline text-sm">DEL</span>
										</span>
									) : (
										key
									)}
								</Button>
							);
						})}
						{rowIndex === 1 && <div className="flex-[0.5]" />}
					</div>
				))}
			</div>
		</div>
	);
}

