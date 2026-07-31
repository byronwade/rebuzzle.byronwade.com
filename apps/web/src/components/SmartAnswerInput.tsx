"use client";

import { ArrowUp, CornerDownLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { haptics } from "@/lib/haptics";
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

const MAX_BAR_HEIGHT = 112;
const MIN_BAR_HEIGHT = 44;

/**
 * The answer bar. Correctness is decided only by /api/puzzles/guess.
 *
 * Nothing here grades what you type. The bar used to colour words and
 * characters live, which told you the answer before you pressed Enter — and it
 * forced the textarea's own text to be transparent behind a positioned overlay,
 * which is what made the caret, selection and autocorrect feel wrong on phones.
 * The textarea now renders its own text, and correctness is revealed once per
 * submitted guess in the trail, where it's earned.
 */
export function SmartAnswerInput({
  onSubmit,
  disabled = false,
  isSubmitting = false,
  className,
}: SmartAnswerInputProps) {
  const [value, setValue] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<CursorPosition | null>(null);
  const undoRedoManager = useRef(new UndoRedoManager());

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !(disabled || isSubmitting);
  const letterCount = useMemo(() => trimmed.replace(/[^\p{L}\p{N}]/gu, "").length, [trimmed]);

  const submit = useCallback(() => {
    if (!canSubmit) return;
    haptics.tap();
    onSubmit(trimmed);
    // Clear immediately — the submitted guess reappears as a chip in the trail,
    // so leaving it in the bar would just be a stale duplicate to delete.
    setValue("");
    undoRedoManager.current = new UndoRedoManager();
  }, [canSubmit, onSubmit, trimmed]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cursor = { start: e.target.selectionStart, end: e.target.selectionEnd };
    undoRedoManager.current.saveState(e.target.value, cursor);
    cursorPositionRef.current = cursor;
    setValue(e.target.value);
  }, []);

  const applyHistoryEntry = useCallback(
    (entry: { text: string; cursorPosition: CursorPosition } | null) => {
      if (!entry) return;
      setValue(entry.text);
      cursorPositionRef.current = entry.cursorPosition;
      setTimeout(() => restoreCursorPosition(textareaRef.current, entry.cursorPosition), 0);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
        return;
      }

      // Undo/redo keep their shortcuts; the buttons are gone. They were two
      // permanent targets in the dock for something almost nobody reached for.
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        const cursor = cursorPositionRef.current || { start: 0, end: 0 };
        applyHistoryEntry(
          e.shiftKey
            ? undoRedoManager.current.redo(value, cursor)
            : undoRedoManager.current.undo(value, cursor)
        );
      }
    },
    [value, submit, applyHistoryEntry]
  );

  const handleBlur = useCallback(() => {
    cursorPositionRef.current = saveCursorPosition(textareaRef.current);
  }, []);

  // Grow with the content, then scroll.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, MIN_BAR_HEIGHT), MAX_BAR_HEIGHT)}px`;
  }, [value]);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "answer-bar flex items-end gap-2 rounded-2xl border border-border bg-card py-1.5 pr-1.5 pl-4",
          (disabled || isSubmitting) && "opacity-60"
        )}
      >
        <textarea
          aria-describedby="answer-meta"
          aria-label="Your answer"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            "max-h-[112px] min-h-[44px] flex-1 resize-none border-0 bg-transparent py-3 text-base text-foreground outline-none",
            "placeholder:text-subtle focus-visible:shadow-none",
            "touch-manipulation [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            (disabled || isSubmitting) && "cursor-not-allowed"
          )}
          disabled={disabled || isSubmitting}
          // "go" gives phone keyboards a Go key instead of a newline key.
          enterKeyHint="go"
          inputMode="text"
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer…"
          ref={textareaRef}
          rows={1}
          spellCheck={false}
          value={value}
        />

        <button
          aria-label="Submit answer"
          className={cn(
            "answer-send mb-0.5 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full",
            "bg-foreground text-background focus-ring",
            "hover:bg-foreground/85 disabled:pointer-events-none"
          )}
          disabled={!canSubmit}
          onClick={submit}
          type="button"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
          )}
        </button>
      </div>

      {/* Meta rail — fixed height so nothing below it ever shifts. */}
      <div className="flex h-6 items-center justify-between gap-3 px-1.5 pt-1.5" id="answer-meta">
        <p aria-live="polite" className="truncate text-subtle text-xs">
          {letterCount > 0 ? (
            <span className="font-mono tabular-nums">
              {letterCount} letter{letterCount === 1 ? "" : "s"}
            </span>
          ) : (
            "One guess at a time. Make it count."
          )}
        </p>

        <span
          aria-hidden
          className={cn(
            "hidden shrink-0 items-center gap-1 font-mono text-[11px] text-subtle transition-opacity duration-200 sm:flex",
            canSubmit ? "opacity-100" : "opacity-0"
          )}
        >
          <CornerDownLeft className="h-3 w-3" />
          Enter
        </span>
      </div>
    </div>
  );
}
