# Puzzle Arena Gameplay Design

## Intent

Make the live daily puzzle feel like one deliberate Rebuzzle game surface. The board, difficulty, and remaining guesses currently appear as separate pieces of the page. A connected arena should keep attention on the clue and make each guess feel like a visible turn in a real game.

## Goals

- Put the puzzle metadata, canonical clue board, and three-turn progress meter inside one cohesive arena.
- Give the clue a warm paper inset and restrained curved rim against the app's adaptive ink-and-paper surface.
- Draw the three guesses as tactile square turn tiles, with blue reserved for the active turn and clear success/error states for submitted turns.
- Keep the current puzzle geometry and artwork exactly as rendered by `PuzzleBoard`.
- Keep the answer composer pinned, existing study action working, and all gameplay state and scoring unchanged.
- Respect Dynamic Type, VoiceOver, Reduce Motion, and the current light/dark theme.

## Non-goals

- Changing the puzzle clue, content, difficulty, countdown, hints, score rules, or rewards.
- Adding streak mechanics, timers, lives, or more game actions.
- Rewriting the result screen or conversation timeline in this pass.
- Introducing a new dependency or a new visual treatment for the puzzle artwork itself.

## Player flow

1. The player opens today's puzzle and sees the existing daily title, countdown, and weekly trail.
2. The puzzle type, difficulty, study action, clue board, and guess meter read together as the play arena.
3. The active turn is easy to spot; after a guess, that tile settles into its success or missed-guess state while Eve's existing feedback appears in the conversation below.
4. The pinned answer composer remains available at the bottom throughout play.

## Visual direction

- Follow Thorbis principles: one accent points to the active thing, rims follow curved controls, depth signals pressability, and spacing replaces decorative divider lines.
- Keep Rebuzzle's warm paper and ink tones and use its existing electric-blue accent only for the active turn and focused controls.
- Give the clue board a subtly inset paper surface; keep the outer arena calm and planar.
- Use rounded square turn tiles rather than generic status dots. Animation confirms a state change but never carries the only meaning.
- Retain the current readable type scale and adapt the arena metadata into a vertical stack at accessibility sizes.

## Constraints and acceptance

- `PuzzleBoard` remains the single source of clue rendering. Its `Puzzle` input, geometry, and scaling are unchanged.
- `attemptHeader` continues to expose the same `dailyGuessProgress` accessibility label and value.
- The current guess count, success/error colors, score-locked copy, and Reduce Motion behavior remain accurate.
- The `dailyGuessProgress` element stays inside the arena's accessibility container and keeps its existing label and value.
- `studyPuzzle` remains a 44-point-minimum control.
- UI automation checks that the board and guess meter are composed inside the same arena.
- Manual simulator review covers the normal play screen, keyboard-visible layout, and a dark appearance. A simulator build must succeed before the UI is considered ready.

## Implementation calls

- Extract the arena into a focused SwiftUI view so TodayView orchestrates gameplay while the arena owns its visual composition.
- Reuse `Theme`, `DifficultyBadge`, `PuzzleBoard`, and the existing AppModel state rather than adding parallel models or custom artwork.
- Keep the existing weekly trail, Eve chat, answer composer, result, and Journey behavior intact.
