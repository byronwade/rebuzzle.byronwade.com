/**
 * Text Area Utilities
 *
 * Utilities for cursor management, text manipulation, and undo/redo functionality
 */

/**
 * Cursor position information
 */
export interface CursorPosition {
  start: number;
  end: number;
}

/**
 * Save cursor position from a textarea element
 */
export function saveCursorPosition(textarea: HTMLTextAreaElement | null): CursorPosition | null {
  if (!textarea) return null;

  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  };
}

/**
 * Restore cursor position to a textarea element
 * Used for undo/redo and tab completion - NOT for normal typing
 */
export function restoreCursorPosition(
  textarea: HTMLTextAreaElement | null,
  position: CursorPosition | null
): void {
  if (!(textarea && position)) return;

  // Ensure positions are within bounds
  const maxPos = textarea.value.length;
  const start = Math.max(0, Math.min(position.start, maxPos));
  const end = Math.max(0, Math.min(position.end, maxPos));

  try {
    // Focus first to ensure setSelectionRange works
    if (document.activeElement !== textarea) {
      textarea.focus();
    }
    textarea.setSelectionRange(start, end);
  } catch (error) {
    // Silently fail if selection can't be set (e.g., element not visible)
    console.warn("Failed to restore cursor position:", error);
  }
}

/**
 * Get text before cursor
 */
export function getTextBeforeCursor(text: string, cursorPosition: number): string {
  return text.slice(0, cursorPosition);
}

/**
 * Get text after cursor
 */
export function getTextAfterCursor(text: string, cursorPosition: number): string {
  return text.slice(cursorPosition);
}

/**
 * Get current word at cursor position
 */
export function getCurrentWord(
  text: string,
  cursorPosition: number
): { word: string; start: number; end: number } | null {
  // Find word boundaries
  const beforeCursor = text.slice(0, cursorPosition);
  const afterCursor = text.slice(cursorPosition);

  // Find start of word (non-whitespace before cursor)
  const beforeMatch = beforeCursor.match(/\S*$/);
  const wordStart = beforeMatch ? cursorPosition - beforeMatch[0].length : cursorPosition;

  // Find end of word (non-whitespace after cursor)
  const afterMatch = afterCursor.match(/^\S*/);
  const wordEnd = afterMatch ? cursorPosition + afterMatch[0].length : cursorPosition;

  if (wordStart === wordEnd) return null;

  return {
    word: text.slice(wordStart, wordEnd),
    start: wordStart,
    end: wordEnd,
  };
}

/**
 * Insert text at cursor position
 */
export function insertTextAtCursor(
  text: string,
  cursorPosition: CursorPosition,
  insertText: string
): { newText: string; newPosition: CursorPosition } {
  const before = text.slice(0, cursorPosition.start);
  const after = text.slice(cursorPosition.end);
  const newText = before + insertText + after;
  const newStart = cursorPosition.start + insertText.length;

  return {
    newText,
    newPosition: { start: newStart, end: newStart },
  };
}

/**
 * Undo/Redo stack entry
 */
export interface UndoRedoEntry {
  text: string;
  cursorPosition: CursorPosition;
  timestamp: number;
}

/**
 * Undo/Redo manager
 */
export class UndoRedoManager {
  private undoStack: UndoRedoEntry[] = [];
  private redoStack: UndoRedoEntry[] = [];
  private maxStackSize: number;

  constructor(maxStackSize = 50) {
    this.maxStackSize = maxStackSize;
  }

  /**
   * Save current state to undo stack
   */
  saveState(text: string, cursorPosition: CursorPosition): void {
    const entry: UndoRedoEntry = {
      text,
      cursorPosition,
      timestamp: Date.now(),
    };

    this.undoStack.push(entry);

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  /**
   * Undo last action
   */
  undo(currentText: string, currentCursor: CursorPosition): UndoRedoEntry | null {
    if (this.undoStack.length === 0) return null;

    // Save current state to redo stack
    this.redoStack.push({
      text: currentText,
      cursorPosition: currentCursor,
      timestamp: Date.now(),
    });

    // Pop from undo stack
    const entry = this.undoStack.pop();
    return entry || null;
  }

  /**
   * Redo last undone action
   */
  redo(currentText: string, currentCursor: CursorPosition): UndoRedoEntry | null {
    if (this.redoStack.length === 0) return null;

    // Save current state to undo stack
    this.undoStack.push({
      text: currentText,
      cursorPosition: currentCursor,
      timestamp: Date.now(),
    });

    // Pop from redo stack
    const entry = this.redoStack.pop();
    return entry || null;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

/**
 * Character validation result
 */
export interface CharacterValidation {
  index: number;
  char: string;
  status: "correct" | "partial" | "incorrect" | "unknown";
  expectedChar?: string;
}

/**
 * Validate characters in input against answer
 */
export function validateCharacters(
  input: string,
  answer: string,
  fuzzyThreshold = 0.8
): CharacterValidation[] {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedAnswer = answer.toLowerCase().trim();

  const validations: CharacterValidation[] = [];

  for (let i = 0; i < normalizedInput.length; i++) {
    const char = normalizedInput[i]!;
    const expectedChar = normalizedAnswer[i];

    if (!expectedChar) {
      validations.push({
        index: i,
        char,
        status: "incorrect",
      });
      continue;
    }

    if (char === expectedChar) {
      validations.push({
        index: i,
        char,
        status: "correct",
        expectedChar,
      });
    } else if (char === " " && expectedChar === " ") {
      validations.push({
        index: i,
        char,
        status: "correct",
        expectedChar,
      });
    } else {
      // Check if character is close (for fuzzy matching)
      const similarity = calculateCharSimilarity(char, expectedChar);
      validations.push({
        index: i,
        char,
        status: similarity >= fuzzyThreshold ? "partial" : "incorrect",
        expectedChar,
      });
    }
  }

  return validations;
}

/**
 * Calculate similarity between two characters
 */
function calculateCharSimilarity(char1: string, char2: string): number {
  if (char1 === char2) return 1.0;

  // Common character substitutions
  const substitutions: Record<string, string[]> = {
    a: ["e", "o"],
    e: ["a", "i"],
    i: ["e", "y"],
    o: ["a", "u"],
    u: ["o"],
    s: ["z", "c"],
    z: ["s"],
    c: ["s", "k"],
    k: ["c"],
  };

  const char1Subs = substitutions[char1] || [];
  if (char1Subs.includes(char2)) return 0.7;

  // Keyboard proximity (simple approximation)
  const keyboardRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  for (const row of keyboardRows) {
    const idx1 = row.indexOf(char1);
    const idx2 = row.indexOf(char2);
    if (idx1 >= 0 && idx2 >= 0) {
      const distance = Math.abs(idx1 - idx2);
      if (distance <= 1) return 0.5;
    }
  }

  return 0.0;
}

/**
 * Split text into words while preserving spaces
 */
export function splitWordsPreservingSpaces(text: string): Array<{
  text: string;
  isSpace: boolean;
  index: number;
}> {
  const result: Array<{ text: string; isSpace: boolean; index: number }> = [];
  let currentIndex = 0;

  // Match words and spaces separately
  const regex = /(\S+|\s+)/g;
  let match = regex.exec(text);

  while (match !== null) {
    const matchedText = match[0] ?? "";
    const isSpace = /^\s+$/.test(matchedText);
    result.push({
      text: matchedText,
      isSpace,
      index: currentIndex,
    });
    currentIndex += matchedText.length;
    match = regex.exec(text);
  }

  return result;
}

/**
 * Calculate text metrics for overlay matching
 */
export interface TextMetrics {
  fontSize: number;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
  fontFamily: string;
}

/**
 * Get text metrics from a textarea element
 */
export function getTextMetrics(textarea: HTMLTextAreaElement): TextMetrics {
  const computed = window.getComputedStyle(textarea);

  return {
    fontSize: Number.parseFloat(computed.fontSize),
    lineHeight:
      Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.5,
    paddingX: Number.parseFloat(computed.paddingLeft) + Number.parseFloat(computed.paddingRight),
    paddingY: Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom),
    fontFamily: computed.fontFamily,
  };
}
