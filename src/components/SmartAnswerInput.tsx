"use client";

import { Check, Loader2, Redo2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import {
  calculateAdaptiveIntensity,
  type GameType,
  getPsychologicalGamesConfig,
  shouldTriggerGame,
} from "@/ai/config/psychological-games";
import {
  getCharacterFeedbackConfig,
  getTextAreaConfig,
} from "@/ai/config/text-area";
import type { PsychologicalTactic } from "@/ai/services/psychological-games";
import {
  generateConfidenceMessageAction,
  generateContextualHintAction,
  generateMisleadingHintAction,
  generatePsychologicalTactics,
  generateRedHerringAction,
  generateSocialPressureMessageAction,
  generateSuggestionsAction,
  generateTimePressureMessageAction,
} from "@/app/actions/aiActions";
import {
  type CharacterSuggestion,
  type ContextualHint,
  generateFeedbackMessage,
  getSimpleCharacterSuggestion,
  getSimpleWordSuggestion,
  type WordSuggestion,
} from "@/ai/services/text-area-feedback";
import {
  MisleadingHint,
  PsychologicalGames,
} from "@/components/PsychologicalGames";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { calculateProgress as calcProgress } from "@/lib/falseFeedback";
import { fuzzyMatch, validateWords } from "@/lib/fuzzyMatch";
import {
  type CharacterValidation,
  type CursorPosition,
  getTextMetrics,
  restoreCursorPosition,
  saveCursorPosition,
  splitWordsPreservingSpaces,
  UndoRedoManager,
  validateCharacters,
} from "@/lib/textAreaUtils";
import { cn } from "@/lib/utils";

interface SmartAnswerInputProps {
  correctAnswer: string;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  className?: string;
  difficulty?: number; // 1-10 difficulty rating
  puzzleType?: string; // Type of puzzle (e.g., "rebus", "logic-grid")
  puzzle?: string; // Puzzle content for context
}

export function SmartAnswerInput({
  correctAnswer,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  className,
  difficulty = 5, // Default to medium difficulty
  puzzleType,
  puzzle,
}: SmartAnswerInputProps) {
  const [value, setValue] = useState("");
  const [validWords, setValidWords] = useState<boolean[]>([]);
  const [characterValidations, setCharacterValidations] = useState<
    CharacterValidation[]
  >([]);
  const [suggestions, setSuggestions] = useState<{
    characters: CharacterSuggestion[];
    words: WordSuggestion[];
  }>({ characters: [], words: [] });
  const [contextualHint, setContextualHint] = useState<ContextualHint | null>(
    null
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Psychological games state
  const [psychologicalTactics, setPsychologicalTactics] = useState<
    PsychologicalTactic[]
  >([]);
  const [activeGames, setActiveGames] = useState<GameType[]>([]);
  const [misleadingHint, setMisleadingHint] = useState<string>("");
  const [redHerrings, setRedHerrings] = useState<string[]>([]);
  const [timePressureMessage, setTimePressureMessage] = useState<string>("");
  const [socialPressureMessage, setSocialPressureMessage] =
    useState<string>("");
  const [confidenceMessage, setConfidenceMessage] = useState<string>("");
  const [gameTriggerTimes, setGameTriggerTimes] = useState<
    Record<GameType, number>
  >({} as Record<GameType, number>);
  const [startTime] = useState(Date.now());

  // Refs for cursor management
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<CursorPosition | null>(null);
  const lastValueRef = useRef<string>("");
  
  // Refs for psychological games throttling
  const lastCheckTimeRef = useRef<number>(0);
  const lastProgressRef = useRef<number>(0);
  const psychologicalGamesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Undo/Redo manager
  const undoRedoManager = useRef(new UndoRedoManager());

  // Get difficulty-based configuration
  const config = useMemo(() => getTextAreaConfig(difficulty), [difficulty]);
  const characterConfig = useMemo(
    () => getCharacterFeedbackConfig(difficulty),
    [difficulty]
  );
  const psychConfig = useMemo(
    () => getPsychologicalGamesConfig(difficulty),
    [difficulty]
  );

  // Suggestion timeout
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Validation debounce timeout
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate progress and time spent
  // Improved progress calculation that works better for word-based answers
  const progress = useMemo(() => {
    const calculated = calcProgress(value, correctAnswer);
    // Boost progress slightly if user has typed something meaningful
    // This helps psychological games trigger more reliably
    if (value.trim().length > 0 && calculated < 0.1) {
      // If they've typed something but progress is very low, give a small boost
      // to help games trigger (but don't over-inflate it)
      return Math.min(0.15, calculated + 0.05);
    }
    return calculated;
  }, [value, correctAnswer]);
  const timeSpent = useMemo(
    () => Math.floor((Date.now() - startTime) / 1000),
    [startTime]
  );

  // Generate psychological tactics on mount
  useEffect(() => {
    const generateTactics = async () => {
      if (!puzzle) return;

      try {
        const tactics = await generatePsychologicalTactics({
          puzzle,
          answer: correctAnswer,
          difficulty,
          puzzleType,
        });
        setPsychologicalTactics(tactics);
      } catch (error) {
        console.warn(
          "[SmartAnswerInput] Failed to generate psychological tactics:",
          error
        );
      }
    };

    generateTactics();
  }, [puzzle, correctAnswer, difficulty, puzzleType]);

  // Memoize validation results to avoid recalculating on every render
  const validationResults = useMemo(() => {
    if (!value.trim()) {
      return { wordValidation: [], charValidations: [] };
    }

    const wordValidation = validateWords(value, correctAnswer);
    const charValidations =
      characterConfig.showCorrect ||
      characterConfig.showPartial ||
      characterConfig.showIncorrect
        ? validateCharacters(value, correctAnswer)
        : [];

    return { wordValidation, charValidations };
  }, [value, correctAnswer, characterConfig]);

  // Debounced validation update (150ms delay for smoother typing)
  useEffect(() => {
    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Immediate update for empty value
    if (!value.trim()) {
      setValidWords([]);
      setCharacterValidations([]);
      return;
    }

    // Debounce validation updates
    validationTimeoutRef.current = setTimeout(() => {
      startTransition(() => {
        setValidWords(validationResults.wordValidation);
        setCharacterValidations(validationResults.charValidations);
      });
    }, 150);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value, validationResults]);

  // Generate AI suggestions based on difficulty and input
  useEffect(() => {
    if (!value.trim() || value.length < config.suggestionThreshold) {
      setSuggestions({ characters: [], words: [] });
      setShowSuggestions(false);
      return;
    }

    // Clear existing timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Generate suggestions based on timing strategy
    const generateSuggestionsAsync = async () => {
      if (config.suggestionTiming === "none") {
        return;
      }

      if (config.suggestionTiming === "on-request" && !showSuggestions) {
        return;
      }

      try {
        const result = await generateSuggestionsAction({
          currentInput: value,
          correctAnswer,
          difficulty,
          puzzleType,
          puzzle,
        });
        // Use startTransition for non-urgent suggestion updates
        startTransition(() => {
          setSuggestions({
            characters: result.characterSuggestions,
            words: result.wordSuggestions,
          });
          setShowSuggestions(true);
        });
      } catch (error) {
        console.warn(
          "[SmartAnswerInput] Failed to generate suggestions:",
          error
        );
        // Fallback to simple suggestions
        const simpleChar = getSimpleCharacterSuggestion(value, correctAnswer);
        const simpleWord = getSimpleWordSuggestion(value, correctAnswer);
        startTransition(() => {
          setSuggestions({
            characters: simpleChar
              ? [
                  {
                    position: value.length,
                    suggestedChar: simpleChar,
                    confidence: 0.5,
                  },
                ]
              : [],
            words: simpleWord ? [{ word: simpleWord, confidence: 0.5 }] : [],
          });
        });
      }
    };

    if (config.suggestionTiming === "immediate") {
      generateSuggestionsAsync();
    } else if (config.suggestionTiming === "moderate") {
      suggestionTimeoutRef.current = setTimeout(
        generateSuggestionsAsync,
        config.suggestionDelayMs
      );
    } else if (config.suggestionTiming === "on-request" && showSuggestions) {
      generateSuggestionsAsync();
    }

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [
    value,
    correctAnswer,
    difficulty,
    puzzleType,
    puzzle,
    config,
    showSuggestions,
  ]);

  // Generate contextual hint (non-urgent update)
  useEffect(() => {
    if (!(config.showContextualHints && value.trim())) {
      setContextualHint(null);
      return;
    }

    const generateHint = async () => {
      try {
        const hint = await generateContextualHintAction({
          currentInput: value,
          correctAnswer,
          difficulty,
          puzzleType,
          puzzle,
        });
        // Use startTransition for non-urgent hint updates
        startTransition(() => {
          setContextualHint(hint);
        });
      } catch (error) {
        console.warn("[SmartAnswerInput] Failed to generate hint:", error);
      }
    };

    // Debounce hint generation
    const timeout = setTimeout(generateHint, 2000);
    return () => clearTimeout(timeout);
  }, [value, correctAnswer, difficulty, puzzleType, puzzle, config]);

  // Generate feedback message (non-urgent update)
  useEffect(() => {
    const generateMessage = async () => {
      const message = await generateFeedbackMessage({
        currentInput: value,
        correctAnswer,
        difficulty,
        isValid: fuzzyMatch(value, correctAnswer, 85),
        isComplete:
          value.trim().toLowerCase() === correctAnswer.toLowerCase().trim(),
      });
      // Use startTransition for non-urgent feedback updates
      startTransition(() => {
        setFeedbackMessage(message);
      });
    };
    generateMessage();
  }, [value, correctAnswer, difficulty]);

  // Trigger psychological games based on conditions
  useEffect(() => {
    // Clear any existing timeout first
    if (psychologicalGamesTimeoutRef.current) {
      clearTimeout(psychologicalGamesTimeoutRef.current);
      psychologicalGamesTimeoutRef.current = null;
    }

    if (!(value.trim() && puzzle)) return;

    // Throttle checks: only check if enough time has passed (2 seconds minimum)
    // or if progress has changed significantly (5% threshold)
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimeRef.current;
    const progressDelta = Math.abs(progress - lastProgressRef.current);
    const minCheckInterval = 2000; // 2 seconds minimum between checks
    const progressThreshold = 0.05; // 5% progress change

    // Skip if not enough time has passed and progress hasn't changed significantly
    if (
      timeSinceLastCheck < minCheckInterval &&
      progressDelta < progressThreshold
    ) {
      return;
    }

    const triggerGames = async () => {
      lastCheckTimeRef.current = Date.now();
      lastProgressRef.current = progress;

      const newActiveGames: GameType[] = [];

      // Check each game type
      for (const [gameType, gameConfig] of Object.entries(
        psychConfig.gameTypes
      )) {
        const lastTrigger = gameTriggerTimes[gameType as GameType] || 0;
        const shouldTrigger = shouldTriggerGame(
          gameConfig,
          progress,
          timeSpent,
          lastTrigger > 0 ? lastTrigger : null
        );

        if (shouldTrigger) {
          newActiveGames.push(gameType as GameType);
          setGameTriggerTimes((prev) => ({
            ...prev,
            [gameType]: Date.now() / 1000,
          }));

          // Debug logging (only in development) - only log when something actually triggers
          if (process.env.NODE_ENV === "development") {
            console.log(`[PsychologicalGames] Triggered: ${gameType}`, {
              progress: Math.round(progress * 100) + "%",
              timeSpent: timeSpent + "s",
            });
          }

          // Generate game-specific content with fallbacks
          switch (gameType) {
            case "misleading-hints":
              try {
                const hint = await generateMisleadingHintAction({
                  puzzle,
                  answer: correctAnswer,
                  difficulty,
                  currentInput: value,
                });
                if (hint && hint.trim()) {
                  setMisleadingHint(hint);
                } else {
                  // Fallback misleading hints
                  const fallbacks = [
                    "Have you considered looking at this from a different perspective?",
                    "Maybe try thinking about it in reverse...",
                    "Some users find it helpful to focus on the details...",
                    "What if you approached this differently?",
                  ];
                  setMisleadingHint(
                    fallbacks[Math.floor(Math.random() * fallbacks.length)]!
                  );
                }
              } catch (error) {
                console.warn(
                  "[SmartAnswerInput] Failed to generate misleading hint:",
                  error
                );
                // Fallback on error
                const fallbacks = [
                  "Try a different approach...",
                  "Consider alternative interpretations...",
                ];
                setMisleadingHint(
                  fallbacks[Math.floor(Math.random() * fallbacks.length)]!
                );
              }
              break;

            case "red-herrings":
              try {
                const herring = await generateRedHerringAction({
                  puzzle,
                  answer: correctAnswer,
                  difficulty,
                  currentInput: value,
                });
                if (herring && herring.trim()) {
                  setRedHerrings((prev) => [...prev, herring].slice(-3)); // Keep last 3
                }
              } catch (error) {
                console.warn(
                  "[SmartAnswerInput] Failed to generate red herring:",
                  error
                );
                // Fallback red herrings based on puzzle type
                const fallbackHerrings = [
                  "Consider synonyms...",
                  "Think about homophones...",
                  "Maybe it's an anagram?",
                ];
                const fallback =
                  fallbackHerrings[
                    Math.floor(Math.random() * fallbackHerrings.length)
                  ]!;
                setRedHerrings((prev) => [...prev, fallback].slice(-3));
              }
              break;

            case "time-pressure":
              try {
                const message = await generateTimePressureMessageAction({
                  difficulty,
                  timeSpent,
                });
                if (message && message.trim()) {
                  setTimePressureMessage(message);
                } else {
                  // Fallback time pressure messages
                  const fallbacks = [
                    `Most users solve this in ${Math.round(60 + Math.random() * 60)}s...`,
                    "Time's ticking...",
                    "You're taking longer than average...",
                  ];
                  setTimePressureMessage(
                    fallbacks[Math.floor(Math.random() * fallbacks.length)]!
                  );
                }
              } catch (error) {
                console.warn(
                  "[SmartAnswerInput] Failed to generate time pressure:",
                  error
                );
                // Fallback on error
                setTimePressureMessage("Time's ticking...");
              }
              break;

            case "social-pressure":
              try {
                const message = await generateSocialPressureMessageAction({
                  difficulty,
                  progress,
                  timeSpent,
                });
                if (message && message.trim()) {
                  setSocialPressureMessage(message);
                } else {
                  // Fallback social pressure messages
                  const solveRate = 85 + Math.random() * 10;
                  setSocialPressureMessage(
                    `${Math.round(solveRate)}% of users solve this puzzle`
                  );
                }
              } catch (error) {
                console.warn(
                  "[SmartAnswerInput] Failed to generate social pressure:",
                  error
                );
                // Fallback on error
                setSocialPressureMessage("Most users find this straightforward...");
              }
              break;

            case "confidence-manipulation":
              try {
                const message = await generateConfidenceMessageAction({
                  puzzle,
                  answer: correctAnswer,
                  difficulty,
                  currentInput: value,
                  progress,
                });
                if (message && message.trim()) {
                  setConfidenceMessage(message);
                } else {
                  // Fallback confidence messages
                  const fallbacks = [
                    "Are you sure about that approach?",
                    "You might want to reconsider...",
                    "Have you considered all possibilities?",
                  ];
                  setConfidenceMessage(
                    fallbacks[Math.floor(Math.random() * fallbacks.length)]!
                  );
                }
              } catch (error) {
                console.warn(
                  "[SmartAnswerInput] Failed to generate confidence message:",
                  error
                );
                // Fallback on error
                setConfidenceMessage("Are you sure about that?");
              }
              break;
          }
        }
      }

      setActiveGames(newActiveGames);
    };

    // Debounce game triggering with longer delay to reduce AI requests
    // Only check if enough time has passed since last check
    psychologicalGamesTimeoutRef.current = setTimeout(triggerGames, 2000);
    
    return () => {
      if (psychologicalGamesTimeoutRef.current) {
        clearTimeout(psychologicalGamesTimeoutRef.current);
        psychologicalGamesTimeoutRef.current = null;
      }
    };
  }, [
    value,
    progress,
    timeSpent,
    puzzle,
    correctAnswer,
    difficulty,
    psychConfig,
    gameTriggerTimes,
  ]);

  // Sync overlay metrics with textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!(textarea && overlay)) return;

    const syncMetrics = () => {
      const metrics = getTextMetrics(textarea);
      overlay.style.fontSize = `${metrics.fontSize}px`;
      overlay.style.lineHeight = `${metrics.lineHeight}px`;
      overlay.style.fontFamily = metrics.fontFamily;
      overlay.style.paddingLeft = window.getComputedStyle(textarea).paddingLeft;
      overlay.style.paddingRight =
        window.getComputedStyle(textarea).paddingRight;
      overlay.style.paddingTop = window.getComputedStyle(textarea).paddingTop;
      overlay.style.paddingBottom =
        window.getComputedStyle(textarea).paddingBottom;
    };

    syncMetrics();
    window.addEventListener("resize", syncMetrics);
    return () => window.removeEventListener("resize", syncMetrics);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // Save cursor position before update
      cursorPositionRef.current = saveCursorPosition(textareaRef.current);

      // Save state for undo/redo
      if (lastValueRef.current !== value) {
        undoRedoManager.current.saveState(
          value,
          cursorPositionRef.current || { start: 0, end: 0 }
        );
      }

      setValue(newValue);
      lastValueRef.current = newValue;

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (cursorPositionRef.current) {
          restoreCursorPosition(textareaRef.current, cursorPositionRef.current);
        }
      });
    },
    [value]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle Enter to submit
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim()) {
          onSubmit(value);
        }
        return;
      }

      // Handle Undo (Cmd/Ctrl+Z)
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const entry = undoRedoManager.current.undo(
          value,
          cursorPositionRef.current || { start: 0, end: 0 }
        );
        if (entry) {
          setValue(entry.text);
          cursorPositionRef.current = entry.cursorPosition;
          requestAnimationFrame(() => {
            restoreCursorPosition(textareaRef.current, entry.cursorPosition);
          });
        }
        return;
      }

      // Handle Redo (Cmd/Ctrl+Shift+Z)
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const entry = undoRedoManager.current.redo(
          value,
          cursorPositionRef.current || { start: 0, end: 0 }
        );
        if (entry) {
          setValue(entry.text);
          cursorPositionRef.current = entry.cursorPosition;
          requestAnimationFrame(() => {
            restoreCursorPosition(textareaRef.current, entry.cursorPosition);
          });
        }
        return;
      }

      // Handle Tab to accept suggestion
      if (e.key === "Tab" && suggestions.words.length > 0) {
        e.preventDefault();
        const firstSuggestion = suggestions.words[0];
        if (firstSuggestion) {
          const words = value.trim().split(/\s+/);
          const newValue =
            words.slice(0, -1).join(" ") +
            (words.length > 1 ? " " : "") +
            firstSuggestion.word;
          setValue(newValue);
          cursorPositionRef.current = {
            start: newValue.length,
            end: newValue.length,
          };
          requestAnimationFrame(() => {
            restoreCursorPosition(
              textareaRef.current,
              cursorPositionRef.current
            );
          });
        }
        return;
      }
    },
    [value, suggestions, onSubmit, disabled]
  );

  const handleFocus = useCallback(() => {
    // Ensure cursor is visible
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd
      );
    }
  }, []);

  const handleBlur = useCallback(() => {
    // Save cursor position on blur
    cursorPositionRef.current = saveCursorPosition(textareaRef.current);
  }, []);

  // Check if answer is correct (with fuzzy matching)
  const isCorrect = fuzzyMatch(value, correctAnswer, 85);

  // Split value into words for highlighting
  const wordParts = useMemo(() => splitWordsPreservingSpaces(value), [value]);

  // Get character status for rendering
  const getCharacterStatus = useCallback(
    (index: number): "correct" | "partial" | "incorrect" | "unknown" => {
      const validation = characterValidations[index];
      if (!validation) return "unknown";
      return validation.status;
    },
    [characterValidations]
  );

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Psychological Games - ABOVE text area for misdirection */}
      <PsychologicalGames
        activeGames={activeGames}
        confidenceMessage={confidenceMessage}
        enabled={psychConfig.intensityMultiplier > 0}
        intensity={calculateAdaptiveIntensity(
          psychConfig.gameTypes["time-pressure"].baseIntensity,
          progress,
          timeSpent,
          psychConfig.intensityMultiplier
        )}
        redHerrings={redHerrings}
        socialPressureMessage={socialPressureMessage}
        timePressureMessage={timePressureMessage}
      />

      {/* Misleading Hint - ABOVE text area */}
      {misleadingHint && activeGames.includes("misleading-hints") && (
        <MisleadingHint
          enabled={psychConfig.gameTypes["misleading-hints"].enabled}
          hint={misleadingHint}
          intensity={calculateAdaptiveIntensity(
            psychConfig.gameTypes["misleading-hints"].baseIntensity,
            progress,
            timeSpent,
            psychConfig.intensityMultiplier
          )}
        />
      )}

      <div className="relative">
        {/* Hidden overlay for word/character highlighting - must match textarea exactly */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md text-base leading-normal"
          ref={overlayRef}
          style={{
            lineHeight: "1.5",
            padding: "0.5rem 0.75rem", // Match textarea default padding
          }}
        >
          {wordParts.map((part, partIndex) => {
            if (part.isSpace) {
              return <span key={partIndex}>{part.text}</span>;
            }

            const wordIndex = wordParts
              .slice(0, partIndex)
              .filter((p) => !p.isSpace).length;
            const isValid = validWords[wordIndex];

            // Render character by character if character-level feedback is enabled
            if (characterConfig.showCorrect && part.text.length > 0) {
              return (
                <span
                  className={cn(isValid && "font-semibold")}
                  key={partIndex}
                >
                  {part.text.split("").map((char, charIndex) => {
                    const globalCharIndex = part.index + charIndex;
                    const status = getCharacterStatus(globalCharIndex);

                    return (
                      <span
                        className={cn(
                          "transition-colors duration-200",
                          status === "correct" && "text-green-600",
                          status === "partial" &&
                            characterConfig.showPartial &&
                            "text-yellow-600",
                          status === "incorrect" &&
                            characterConfig.showIncorrect &&
                            "text-red-400 opacity-50",
                          isValid && status === "unknown" && "text-green-600"
                        )}
                        key={charIndex}
                        style={{
                          opacity: characterConfig.colorIntensity,
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </span>
              );
            }

            // Word-level only
            return (
              <span
                className={cn(
                  "transition-colors duration-200",
                  isValid && "font-semibold text-green-600"
                )}
                key={partIndex}
              >
                {part.text}
              </span>
            );
          })}
        </div>

        {/* Shadcn Textarea */}
        <Textarea
          aria-describedby="answer-feedback"
          aria-label="Puzzle answer input"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            "min-h-[100px] resize-none text-base",
            "relative z-10",
            "transition-all duration-200",
            isCorrect && !isSubmitting && "border-green-500 focus-visible:ring-green-500",
            isSubmitting && "opacity-75 cursor-wait",
            // Make text transparent so overlay shows through
            value && "text-transparent caret-foreground",
            // Mobile optimization - ensure font size is at least 16px
            "text-base sm:text-base",
            "touch-manipulation",
            // Better focus styles
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            // Better disabled state
            (disabled || isSubmitting) && "opacity-60 cursor-not-allowed"
          )}
          disabled={disabled || isSubmitting}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer here…"
          ref={textareaRef}
          rows={4}
          spellCheck={false}
          value={value}
          // Better mobile support
          inputMode="text"
        />
      </div>

      {/* Suggestions display */}
      {showSuggestions &&
        (suggestions.words.length > 0 || suggestions.characters.length > 0) &&
        config.showAutocomplete && (
          <div className="space-y-1 rounded-lg border bg-muted/50 p-2">
            {suggestions.words.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.words.slice(0, 3).map((suggestion, index) => (
                  <button
                    className="min-h-[44px] rounded-md border bg-background px-3 py-2 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-0 sm:px-2 sm:py-1"
                    key={index}
                    onClick={() => {
                      const words = value.trim().split(/\s+/);
                      const newValue =
                        words.slice(0, -1).join(" ") +
                        (words.length > 1 ? " " : "") +
                        suggestion.word;
                      setValue(newValue);
                      cursorPositionRef.current = {
                        start: newValue.length,
                        end: newValue.length,
                      };
                      requestAnimationFrame(() => {
                        restoreCursorPosition(
                          textareaRef.current,
                          cursorPositionRef.current
                        );
                      });
                    }}
                    type="button"
                  >
                    {suggestion.word}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Contextual hint (accurate, not misleading) */}
      {contextualHint && config.showContextualHints && (
        <div
          aria-live="polite"
          className={cn(
            "rounded-lg border p-3 text-sm",
            contextualHint.urgency === "high" && "border-amber-300 bg-amber-50",
            contextualHint.urgency === "medium" && "border-blue-300 bg-blue-50",
            contextualHint.urgency === "low" && "border-muted bg-muted/30"
          )}
          role="status"
        >
          <p>{contextualHint.hint}</p>
        </div>
      )}

      {/* Feedback with icon */}
      {isCorrect && !isSubmitting && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 font-medium text-green-600 text-sm"
          id="answer-feedback"
          role="status"
        >
          <Check className="h-4 w-4" />
          <span>Perfect! Press Enter to submit.</span>
        </div>
      )}

      {/* Loading state */}
      {isSubmitting && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 font-medium text-muted-foreground text-sm"
          id="answer-feedback"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          <span>Submitting…</span>
        </div>
      )}

      {/* Feedback message */}
      {feedbackMessage && !isCorrect && value.length > 0 && (
        <p
          aria-live="polite"
          className="text-muted-foreground text-sm"
          id="answer-feedback"
          role="status"
        >
          {feedbackMessage}
        </p>
      )}

      {/* Psychological Games - Below text area for additional misdirection */}
      {activeGames.length > 0 && value.length > 0 && (
        <div className="space-y-2">
          {/* Additional confidence manipulation below */}
          {confidenceMessage &&
            activeGames.includes("confidence-manipulation") && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-2 text-purple-700 text-xs">
                {confidenceMessage}
              </div>
            )}
        </div>
      )}

      {/* Default message when empty */}
      {value.length === 0 && !isSubmitting && (
        <p className="text-muted-foreground text-sm">
          Words will turn{" "}
          <span className="font-semibold text-green-600">green</span> as you
          type correct answers.
        </p>
      )}

      {/* Undo/Redo buttons (optional, can be hidden via CSS) */}
      {value.length > 0 && (
        <div className="flex items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100">
          <Button
            aria-label="Undo"
            className="min-h-[44px] min-w-[44px] px-2 text-xs sm:h-7 sm:min-h-0 sm:min-w-0"
            disabled={!undoRedoManager.current.canUndo() || isSubmitting}
            onClick={() => {
              const entry = undoRedoManager.current.undo(
                value,
                cursorPositionRef.current || { start: 0, end: 0 }
              );
              if (entry) {
                setValue(entry.text);
                cursorPositionRef.current = entry.cursorPosition;
                requestAnimationFrame(() => {
                  restoreCursorPosition(
                    textareaRef.current,
                    entry.cursorPosition
                  );
                });
              }
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Redo"
            className="min-h-[44px] min-w-[44px] px-2 text-xs sm:h-7 sm:min-h-0 sm:min-w-0"
            disabled={!undoRedoManager.current.canRedo() || isSubmitting}
            onClick={() => {
              const entry = undoRedoManager.current.redo(
                value,
                cursorPositionRef.current || { start: 0, end: 0 }
              );
              if (entry) {
                setValue(entry.text);
                cursorPositionRef.current = entry.cursorPosition;
                requestAnimationFrame(() => {
                  restoreCursorPosition(
                    textareaRef.current,
                    entry.cursorPosition
                  );
                });
              }
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
