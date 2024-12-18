import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GuessBoxesProps {
  currentGuess: string
  answer: string
  gameOver: boolean
  lastSubmittedGuess: string | null
  submittedGuesses: string[]
  onSubmit: () => void
  isGuessFilled: boolean
  handleGuess: () => void
}

export function GuessBoxes({ 
  currentGuess, 
  answer, 
  gameOver, 
  lastSubmittedGuess, 
  submittedGuesses, 
  onSubmit,
  isGuessFilled,
  handleGuess
}: GuessBoxesProps) {
  const answerStructure = answer.split('').map(char => char === ' ' ? 'space' : char.match(/[.,!?]/) ? 'punctuation' : 'letter')

  const renderGuessBoxes = () => {
    let guessIndex = 0
    return answerStructure.map((type, index) => {
      if (type === 'space') {
        return <div key={index} className="w-2" />
      }
      if (type === 'punctuation') {
        return (
          <div key={index} className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold">
            {answer[index]}
          </div>
        )
      }
      const letter = gameOver ? answer[index] : currentGuess[guessIndex]
      const isCorrect = lastSubmittedGuess && lastSubmittedGuess[guessIndex]?.toLowerCase() === answer[index].toLowerCase()
      const isIncorrect = lastSubmittedGuess && lastSubmittedGuess[guessIndex] && lastSubmittedGuess[guessIndex]?.toLowerCase() !== answer[index].toLowerCase()
      guessIndex++
      return (
        <div
          key={index}
          className={cn(
            "w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-md flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold border",
            gameOver 
              ? "bg-gray-200 text-gray-600 border-gray-300" 
              : letter
                ? lastSubmittedGuess
                  ? isCorrect
                    ? "bg-green-500 text-white border-green-600"
                    : isIncorrect
                      ? "bg-red-500 text-white border-red-600"
                      : "bg-purple-100 text-gray-800 border-purple-200"
                  : "bg-purple-100 text-gray-800 border-purple-200"
                : "bg-white text-gray-800 border-gray-300"
          )}
        >
          {gameOver ? (letter || '-') : (letter || '')}
        </div>
      )
    })
  }

  return (
    <div className="relative mb-2 sm:mb-4 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
      <div className="flex justify-center gap-0.5 items-center">
        {renderGuessBoxes()}
      </div>
    </div>
  )
}

