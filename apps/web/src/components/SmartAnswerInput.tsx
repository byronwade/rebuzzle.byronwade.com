"use client";

import { fuzzyMatch, validateWords } from "@rebuzzle/game-logic";
import { Check, Redo2, Undo2 } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCharacterFeedbackConfig, getTextAreaConfig } from "@/ai/config/text-area";
import {
  type CharacterSuggestion,
  type ContextualHint,
  getSimpleCharacterSuggestion,
  getSimpleWordSuggestion,
  type WordSuggestion,
} from "@/ai/services/text-area-feedback";
import { generateContextualHintAction, generateSuggestionsAction } from "@/app/actions/aiActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  difficulty?: number;
  puzzleType?: string;
  puzzle?: string;
}

export function SmartAnswerInput({
  correctAnswer,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  className,
  difficulty = 5,
  puzzleType,
  puzzle,
}: SmartAnswerInputProps) {
  const [value, setValue] = useState("");
  const [validWords, setValidWords] = useState<boolean[]>([]);
  const [characterValidations, setCharacterValidations] = useState<CharacterValidation[]>([]);
  const [suggestions, setSuggestions] = useState<{
    characters: CharacterSuggestion[];
    words: WordSuggestion[];
  }>({ characters: [], words: [] });
  const [contextualHint, setContextualHint] = useState<ContextualHint | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Track undo/redo availability as state (refs don't trigger re-renders)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs for cursor management
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<CursorPosition | null>(null);
  const lastValueRef = useRef<string>("");

  // Undo/Redo manager
  const undoRedoManager = useRef(new UndoRedoManager());

  // Helper to sync undo/redo state after any operation
  const syncUndoRedoState = useCallback(() => {
    setCanUndo(undoRedoManager.current.canUndo());
    setCanRedo(undoRedoManager.current.canRedo());
  }, []);

  // Get difficulty-based configuration
  const config = useMemo(() => getTextAreaConfig(difficulty), [difficulty]);
  const characterConfig = useMemo(() => getCharacterFeedbackConfig(difficulty), [difficulty]);

  // Suggestion timeout
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Validation debounce timeout
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize validation results to avoid recalculating on every render
  const validationResults = useMemo(() => {
    if (!value.trim()) {
      return { wordValidation: [], charValidations: [] };
    }

    const wordValidation = validateWords(value, correctAnswer);
    const charValidations =
      characterConfig.showCorrect || characterConfig.showPartial || characterConfig.showIncorrect
        ? validateCharacters(value, correctAnswer)
        : [];

    return { wordValidation, charValidations };
  }, [value, correctAnswer, characterConfig]);

  // Debounced validation update (150ms delay for smoother typing)
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!value.trim()) {
      setValidWords([]);
      setCharacterValidations([]);
      return;
    }

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
    let cancelled = false;

    if (!value.trim() || value.length < config.suggestionThreshold) {
      setSuggestions({ characters: [], words: [] });
      setShowSuggestions(false);
      return;
    }

    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

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
        // Prevent state update if effect was cleaned up
        if (cancelled) return;
        startTransition(() => {
          setSuggestions({
            characters: result.characterSuggestions,
            words: result.wordSuggestions,
          });
          setShowSuggestions(true);
        });
      } catch (error) {
        // Prevent state update if effect was cleaned up
        if (cancelled) return;
        console.warn("[SmartAnswerInput] Failed to generate suggestions:", error);
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
      suggestionTimeoutRef.current = setTimeout(generateSuggestionsAsync, config.suggestionDelayMs);
    } else if (config.suggestionTiming === "on-request" && showSuggestions) {
      generateSuggestionsAsync();
    }

    return () => {
      cancelled = true;
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [value, correctAnswer, difficulty, puzzleType, puzzle, config, showSuggestions]);

  // Generate contextual hint
  useEffect(() => {
    let cancelled = false;

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
        // Prevent state update if effect was cleaned up
        if (cancelled) return;
        startTransition(() => {
          setContextualHint(hint);
        });
      } catch (error) {
        console.warn("[SmartAnswerInput] Failed to generate hint:", error);
      }
    };

    const timeout = setTimeout(generateHint, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [value, correctAnswer, difficulty, puzzleType, puzzle, config]);

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
      overlay.style.paddingRight = window.getComputedStyle(textarea).paddingRight;
      overlay.style.paddingTop = window.getComputedStyle(textarea).paddingTop;
      overlay.style.paddingBottom = window.getComputedStyle(textarea).paddingBottom;
    };

    syncMetrics();
    window.addEventListener("resize", syncMetrics);
    return () => window.removeEventListener("resize", syncMetrics);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // Save current state for undo BEFORE changing value
      // Use the textarea's current selection which reflects user's cursor position
      const currentCursor = {
        start: e.target.selectionStart,
        end: e.target.selectionEnd,
      };
      undoRedoManager.current.saveState(value, currentCursor);

      // Update cursor position ref for undo/redo operations
      cursorPositionRef.current = currentCursor;

      setValue(newValue);
      lastValueRef.current = newValue;

      // Sync undo/redo button states
      syncUndoRedoState();

      // DON'T restore cursor - let browser handle cursor positioning naturally
      // This fixes the "cursor behind text" and "can't use arrow keys" issues
    },
    [value, syncUndoRedoState]
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
          syncUndoRedoState();
          // Use setTimeout to ensure value is set before restoring cursor
          setTimeout(() => {
            restoreCursorPosition(textareaRef.current, entry.cursorPosition);
          }, 0);
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
          syncUndoRedoState();
          // Use setTimeout to ensure value is set before restoring cursor
          setTimeout(() => {
            restoreCursorPosition(textareaRef.current, entry.cursorPosition);
          }, 0);
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
            words.slice(0, -1).join(" ") + (words.length > 1 ? " " : "") + firstSuggestion.word;
          setValue(newValue);
          const newCursorPos = { start: newValue.length, end: newValue.length };
          cursorPositionRef.current = newCursorPos;
          // Use setTimeout to ensure value is set before restoring cursor
          setTimeout(() => {
            restoreCursorPosition(textareaRef.current, newCursorPos);
          }, 0);
        }
        return;
      }
    },
    [value, suggestions, onSubmit, disabled, syncUndoRedoState]
  );

  const handleFocus = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd
      );
    }
  }, []);

  const handleBlur = useCallback(() => {
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

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set to scrollHeight but cap at max height
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${Math.max(44, newHeight)}px`;
  }, [value]); // Re-run when value changes for dynamic resizing

  return (
    <div className={cn("w-full", className)}>
      {/* Clean input container with success state feedback */}
      <div
        className={cn(
          "rounded-2xl border bg-background px-4 py-3 shadow-sm transition-colors duration-200",
          isCorrect && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
          !isCorrect && "border-border"
        )}
      >
        {/* Input area */}
        <div className="relative">
          {/* Overlay for word/character color highlighting - must match textarea exactly */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-base"
            ref={overlayRef}
            style={{
              // Padding matches textarea's py-3 px-0 (12px top/bottom, 0 left/right)
              padding: "12px 0",
              lineHeight: "1.5",
            }}
          >
            {wordParts.map((part, partIndex) => {
              if (part.isSpace) {
                return <span key={partIndex}>{part.text}</span>;
              }

              const wordIndex = wordParts.slice(0, partIndex).filter((p) => !p.isSpace).length;
              const isValid = validWords[wordIndex];

              // Render character by character if character-level feedback is enabled
              if (characterConfig.showCorrect && part.text.length > 0) {
                return (
                  <span className={cn(isValid && "font-semibold")} key={partIndex}>
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
                              "text-neutral-600 dark:text-neutral-400",
                            status === "incorrect" &&
                              characterConfig.showIncorrect &&
                              "text-neutral-400 dark:text-neutral-600 opacity-50",
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

          {/* Textarea - transparent text with visible caret, overlay shows colors */}
          <Textarea
            aria-describedby="answer-feedback"
            aria-label="Puzzle answer input"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent py-3 px-0 text-base shadow-none",
              "relative z-10",
              "transition-colors duration-200",
              // Make text transparent so colored overlay shows through, but keep caret visible
              value && "text-transparent caret-black dark:caret-white",
              isSubmitting && "opacity-75 cursor-wait",
              "text-base sm:text-base",
              "touch-manipulation",
              "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0",
              (disabled || isSubmitting) && "opacity-60 cursor-not-allowed"
            )}
            disabled={disabled || isSubmitting}
            onBlur={handleBlur}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            ref={textareaRef}
            rows={1}
            spellCheck={false}
            value={value}
            inputMode="text"
          />
        </div>
      </div>

      {/* Minimal feedback - just show success or contextual hint */}
      <div className="flex items-center justify-between px-2 pt-2 min-h-[24px]">
        <div className="flex-1">
          {/* Success feedback */}
          {isCorrect && !isSubmitting && (
            <p
              aria-live="polite"
              className="flex items-center gap-1.5 font-medium text-green-600 text-xs"
              id="answer-feedback"
              role="status"
            >
              <Check className="h-3.5 w-3.5" />
              Correct! Press Enter to submit.
            </p>
          )}

          {/* Contextual hint */}
          {contextualHint && !isCorrect && value.length > 0 && config.showContextualHints && (
            <p aria-live="polite" className="text-muted-foreground text-xs" role="status">
              {contextualHint.hint}
            </p>
          )}

          {/* Default hint */}
          {value.length === 0 && !isSubmitting && (
            <p className="text-muted-foreground text-xs">
              Words turn <span className="text-green-600">green</span> when correct
            </p>
          )}
        </div>

        {/* Undo/Redo - mobile-friendly touch targets */}
        {value.length > 0 && (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Undo"
                    className="h-9 w-9 p-0 sm:h-8 sm:w-8"
                    disabled={!canUndo || isSubmitting}
                    onClick={() => {
                      const entry = undoRedoManager.current.undo(
                        value,
                        cursorPositionRef.current || { start: 0, end: 0 }
                      );
                      if (entry) {
                        setValue(entry.text);
                        cursorPositionRef.current = entry.cursorPosition;
                        syncUndoRedoState();
                        // Use setTimeout to ensure value is set before restoring cursor
                        setTimeout(() => {
                          restoreCursorPosition(textareaRef.current, entry.cursorPosition);
                        }, 0);
                      }
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Cmd+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Redo"
                    className="h-9 w-9 p-0 sm:h-8 sm:w-8"
                    disabled={!canRedo || isSubmitting}
                    onClick={() => {
                      const entry = undoRedoManager.current.redo(
                        value,
                        cursorPositionRef.current || { start: 0, end: 0 }
                      );
                      if (entry) {
                        setValue(entry.text);
                        cursorPositionRef.current = entry.cursorPosition;
                        syncUndoRedoState();
                        // Use setTimeout to ensure value is set before restoring cursor
                        setTimeout(() => {
                          restoreCursorPosition(textareaRef.current, entry.cursorPosition);
                        }, 0);
                      }
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Cmd+Shift+Z)</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
