# Daily Round HUD Design

## Intent

Make the active daily round read as one focused game session: date and level progress sit together above Eve and the clue, while the fixed bottom area remains for the next guess.

## Scope

- iOS Today screen, active daily puzzle state.
- Reuse the existing server-confirmed Journey level and XP values.
- Preserve the puzzle board, three guesses, hints, Eve feedback, countdown, scoring, answer privacy, and navigation.
- Do not add reward rules, streak rules, new colors, dependencies, or extra game modes.

## Current break

At standard text sizes, `ActiveJourneyProgress` is pinned directly above `GuessComposer` in the bottom safe-area inset. It stays there even when the progress value has not changed, taking vertical space from the primary game action. The date is in the scroll content, so the daily round's identity and level progress are split between the top and bottom of the screen.

## Design

- At standard text sizes, place a compact server-confirmed level meter beside the puzzle date in the first status row.
- At accessibility text sizes, keep the complete level name and progress value in a vertical, scrollable readout below the date.
- Remove the persistent progress strip from the fixed composer inset. The composer and new-feedback jump control remain there.
- Keep the existing three-step guess tracker beside the board flow and leave all score changes under the current server rules.
- If the Journey snapshot is incomplete, omit the meter instead of showing stale or partial progress.

## References

- [LinkedIn Wend active puzzle](https://mobbin.com/screens/9875e8a8-8b78-409d-9c6e-d6e97571748a?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): progress and hint actions remain close to the active word puzzle. Keep Rebuzzle's board and Eve conversation; do not copy the grid or color treatment.
- [Opal word-grid puzzle](https://mobbin.com/screens/d1d6695a-2516-4fd4-940f-e7158b122102?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): a small segmented progress indicator sits above the active puzzle. Use the compact hierarchy, not the dark appearance or word-search mechanics.
- [Thorbis design system](https://design.thorbis.com): use the existing Rebuzzle tokens, quiet chrome, one accent, and native iOS behavior.

## Acceptance

- The fixed composer is the only persistent game content above the home indicator, apart from the temporary new-feedback control.
- A complete Journey snapshot appears in the date row as a compact level/progress cue at standard text sizes.
- Accessibility text sizes retain the full progress name/value in the scrollable content.
- Incomplete Journey data does not block or disable guessing.
- Active and completed rounds keep their current answers, scoring, rewards, and navigation.
