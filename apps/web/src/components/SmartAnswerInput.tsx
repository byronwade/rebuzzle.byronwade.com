"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CursorPosition,
  restoreCursorPosition,
  saveCursorPosition,
  UndoRedoManager,
} from "@/lib/textAreaUtils";
import { cn } from "@/lib/utils";

interface SmartAnswerInputProps {
  /** Puzzle id (reserved for future server features) */
  puzzleId?: string;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  className?: string;
  difficulty?: number;
  puzzleType?: string;
  puzzle?: string;
  /** @deprecated Ignored — answers are never validated on the client */
  correctAnswer?: string;
}

/**
 * Free-form answer input. Correctness is decided only by /api/puzzles/guess.
 */
export function SmartAnswerInput({
  onSubmit,
  disabled = false,
  isSubmitting = false,
  className,
}: SmartAnswerInputProps) {
  const [value, setValue] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<CursorPosition | null>(null);
  const undoRedoManager = useRef(new UndoRedoManager());

  const syncUndoRedoState = useCallback(() => {
    setCanUndo(undoRedoManager.current.canUndo());
    setCanRedo(undoRedoManager.current.canRedo());
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const currentCursor = {
        start: e.target.selectionStart,
        end: e.target.selectionEnd,
      };
      undoRedoManager.current.saveState(value, currentCursor);
      cursorPositionRef.current = currentCursor;
      setValue(newValue);
      syncUndoRedoState();
    },
    [value, syncUndoRedoState]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && !isSubmitting && value.trim()) {
          onSubmit(value);
        }
        return;
      }

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
          setTimeout(() => {
            restoreCursorPosition(textareaRef.current, entry.cursorPosition);
          }, 0);
        }
        return;
      }

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
          setTimeout(() => {
            restoreCursorPosition(textareaRef.current, entry.cursorPosition);
          }, 0);
        }
      }
    },
    [value, onSubmit, disabled, isSubmitting, syncUndoRedoState]
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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${Math.max(44, newHeight)}px`;
  }, [value]);

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-2xl border border-border bg-background px-4 py-3 shadow-sm transition-colors duration-200">
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

      <div className="flex items-center justify-between px-2 pt-2 min-h-[24px]">
        <div className="flex-1">
          {value.length === 0 && !isSubmitting && (
            <p className="text-muted-foreground text-xs" id="answer-feedback">
              Type your answer, then press Enter to submit
            </p>
          )}
          {value.length > 0 && !isSubmitting && (
            <p className="text-muted-foreground text-xs" id="answer-feedback">
              Press Enter to submit
            </p>
          )}
        </div>

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
