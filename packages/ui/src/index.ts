/**
 * @rebuzzle/ui
 *
 * Shared UI components for Rebuzzle across web, desktop, and mobile platforms.
 *
 * @example
 * // Import platform hooks
 * import { usePlatform, useAuth, useApi } from '@rebuzzle/ui/platform';
 *
 * // Import game components
 * import { GameBoard, PuzzleDisplay } from '@rebuzzle/ui/game';
 *
 * // Import UI primitives
 * import { Button, Card, Dialog } from '@rebuzzle/ui/primitives';
 *
 * // Import utilities
 * import { cn } from '@rebuzzle/ui/utils';
 */

// Re-export everything from submodules for convenience
export * from "./platform";
export * from "./utils";
export * from "./game";
export * from "./primitives";
// export * from "./features";
