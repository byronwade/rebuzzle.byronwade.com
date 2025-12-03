/**
 * Puzzle Display Utilities
 *
 * Shared formatting logic to ensure consistent puzzle rendering
 * across web, mobile, and desktop platforms.
 *
 * Web app formatting is the source of truth.
 */

/**
 * Display category determines the overall styling approach
 */
export type PuzzleDisplayCategory = 'visual' | 'text' | 'monospace' | 'default';

/**
 * Font size semantic values
 * - large: 48px (visual puzzles with emojis)
 * - medium: 24px (code/cipher puzzles)
 * - small: 14-16px (text-heavy puzzles)
 */
export type FontSize = 'large' | 'medium' | 'small';

/**
 * Font weight options
 */
export type FontWeight = 'bold' | 'semibold' | 'normal';

/**
 * Text alignment options
 */
export type TextAlign = 'center' | 'left';

/**
 * Font family options
 * - emoji: Optimized for emoji rendering with fallbacks
 * - mono: Monospace for code/cipher puzzles
 * - system: Default system font
 */
export type FontFamily = 'emoji' | 'mono' | 'system';

/**
 * Complete display configuration for a puzzle type
 */
export interface PuzzleDisplayConfig {
  category: PuzzleDisplayCategory;
  fontSize: FontSize;
  fontWeight: FontWeight;
  textAlign: TextAlign;
  fontFamily: FontFamily;
  preserveWhitespace: boolean;
}

/**
 * Map puzzle types to their display categories
 */
const PUZZLE_TYPE_CATEGORIES: Record<string, PuzzleDisplayCategory> = {
  // Visual puzzles - large emoji display
  'rebus': 'visual',
  'pattern-recognition': 'visual',

  // Text-heavy puzzles - smaller, left-aligned
  'riddle': 'text',
  'trivia': 'text',
  'logic-grid': 'text',
  'cryptic-crossword': 'text',

  // Code/cipher puzzles - monospace font
  'number-sequence': 'monospace',
  'caesar-cipher': 'monospace',

  // Default category for other puzzle types
  'word-puzzle': 'default',
  'word-ladder': 'default',
};

/**
 * Display configurations for each category
 */
const CATEGORY_CONFIGS: Record<PuzzleDisplayCategory, Omit<PuzzleDisplayConfig, 'category'>> = {
  visual: {
    fontSize: 'large',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'emoji',
    preserveWhitespace: true,
  },
  text: {
    fontSize: 'small',
    fontWeight: 'normal',
    textAlign: 'left',
    fontFamily: 'system',
    preserveWhitespace: false,
  },
  monospace: {
    fontSize: 'medium',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'mono',
    preserveWhitespace: true,
  },
  default: {
    fontSize: 'medium',
    fontWeight: 'semibold',
    textAlign: 'center',
    fontFamily: 'system',
    preserveWhitespace: true,
  },
};

/**
 * Question prompts for each puzzle type
 */
const PUZZLE_QUESTIONS: Record<string, string> = {
  'rebus': 'What does this rebus puzzle represent?',
  'pattern-recognition': 'What pattern comes next?',
  'riddle': 'What is the answer to this riddle?',
  'trivia': 'What is the answer to this trivia question?',
  'logic-grid': 'Use deductive reasoning to solve this logic grid puzzle',
  'cryptic-crossword': 'Solve this cryptic crossword clue',
  'number-sequence': 'What comes next in this number sequence?',
  'caesar-cipher': 'Decode this encrypted message',
  'word-puzzle': 'What is the answer to this word puzzle?',
  'word-ladder': 'Transform the start word into the end word',
};

/**
 * Get the display category for a puzzle type
 */
export function getPuzzleDisplayCategory(puzzleType: string): PuzzleDisplayCategory {
  const normalized = puzzleType.toLowerCase().trim();
  return PUZZLE_TYPE_CATEGORIES[normalized] || 'default';
}

/**
 * Get the complete display configuration for a puzzle type
 */
export function getPuzzleDisplayConfig(puzzleType: string): PuzzleDisplayConfig {
  const category = getPuzzleDisplayCategory(puzzleType);
  return {
    category,
    ...CATEGORY_CONFIGS[category],
  };
}

/**
 * Get the question prompt for a puzzle type
 */
export function getPuzzleQuestion(puzzleType: string): string {
  const normalized = puzzleType.toLowerCase().trim();
  return PUZZLE_QUESTIONS[normalized] || 'What does this puzzle represent?';
}

/**
 * Platform-specific font size values in pixels
 */
export const FONT_SIZE_VALUES: Record<FontSize, number> = {
  large: 48,
  medium: 24,
  small: 16,
};

/**
 * Platform-specific font weight values
 */
export const FONT_WEIGHT_VALUES: Record<FontWeight, number | string> = {
  bold: 700,
  semibold: 600,
  normal: 400,
};

/**
 * CSS class names for each category (for web/desktop)
 */
export const CATEGORY_CSS_CLASSES: Record<PuzzleDisplayCategory, string> = {
  visual: 'puzzle-visual',
  text: 'puzzle-text',
  monospace: 'puzzle-monospace',
  default: 'puzzle-default',
};

/**
 * Get CSS class name for a puzzle type
 */
export function getPuzzleCssClass(puzzleType: string): string {
  const category = getPuzzleDisplayCategory(puzzleType);
  return CATEGORY_CSS_CLASSES[category];
}

/**
 * Emoji font stack for optimal cross-platform emoji rendering
 */
export const EMOJI_FONT_STACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/**
 * Monospace font stack
 */
export const MONO_FONT_STACK = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Get font family CSS value
 */
export function getFontFamilyValue(fontFamily: FontFamily): string {
  switch (fontFamily) {
    case 'emoji':
      return EMOJI_FONT_STACK;
    case 'mono':
      return MONO_FONT_STACK;
    case 'system':
    default:
      return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
}
