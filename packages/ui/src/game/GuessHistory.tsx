import { Check, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../primitives/tooltip";
import { cn } from "../utils/cn";

interface WordResult {
  word: string;
  correct: boolean;
  similarity?: number;
}

interface GuessAttempt {
  text: string;
  timestamp: Date;
  wordResults: WordResult[];
  attemptNumber: number;
}

interface GuessHistoryProps {
  attempts: GuessAttempt[];
  correctAnswer?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export function GuessHistory({
  attempts,
  correctAnswer,
  defaultExpanded = false,
  className,
}: GuessHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (attempts.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("w-full rounded-lg border bg-card", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 h-auto hover:bg-accent/50"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls="guess-history-content"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Guess History ({attempts.length})</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isExpanded ? "Hide" : "Show"} your previous guesses</TooltipContent>
        </Tooltip>

        {isExpanded && (
          <div id="guess-history-content" className="border-t px-4 pb-4 pt-2 space-y-3">
            {attempts.map((attempt, index) => (
              <div key={index} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Attempt {attempt.attemptNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(attempt.timestamp)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {attempt.wordResults.map((result, wordIndex) => (
                    <div
                      key={wordIndex}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium",
                        result.correct
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {result.correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span className="uppercase">{result.word}</span>
                      {result.similarity !== undefined &&
                        !result.correct &&
                        result.similarity >= 50 && (
                          <span className="text-xs opacity-70">
                            ({Math.round(result.similarity)}%)
                          </span>
                        )}
                    </div>
                  ))}
                </div>

                {attempt.wordResults.some(
                  (r) => !r.correct && r.similarity && r.similarity >= 70
                ) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {getCloseGuessHint(attempt.wordResults, correctAnswer)}
                  </div>
                )}
              </div>
            ))}

            {correctAnswer && attempts.length > 0 && (
              <div className="rounded-lg border border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">The correct answer was:</p>
                <p className="font-bold text-lg uppercase tracking-wide">{correctAnswer}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) {
    return "Just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getCloseGuessHint(wordResults: WordResult[], correctAnswer?: string): string | null {
  const closeWords = wordResults.filter((r) => !r.correct && r.similarity && r.similarity >= 70);

  if (closeWords.length === 0) return null;

  const firstClose = closeWords[0]!;

  if (correctAnswer) {
    const correctWords = correctAnswer.split(/\s+/);
    const index = wordResults.findIndex((r) => r.word === firstClose.word);
    if (index >= 0 && correctWords[index]) {
      return `Close! You guessed "${firstClose.word}" but it was "${correctWords[index]}"`;
    }
  }

  return `You were close with "${firstClose.word}"!`;
}

export type { GuessAttempt, WordResult };
