'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface KeyboardProps {
  onKeyPress: (key: string) => void
  disabled: boolean
}

export function Keyboard({ onKeyPress, disabled }: KeyboardProps) {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ]

  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
          {row.map((key) => (
            <Button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={disabled}
              className={cn(
                "h-8 sm:h-9 md:h-10 px-1 sm:px-1.5 md:px-2 text-[10px] sm:text-xs md:text-sm font-semibold rounded-md",
                key === 'ENTER' || key === 'BACKSPACE'
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {key === 'BACKSPACE' ? '←' : key}
            </Button>
          ))}
        </div>
      ))}
    </div>
  )
}

