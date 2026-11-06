# Eve Chat and Navigation Reset Implementation Plan

> Implement this visual reset in the existing dirty worktree. Preserve all unrelated staged, unstaged, and untracked work.

**Goal:** Make Rebuzzle's home feel like one playable Eve conversation and make the drawer easier to scan.

**Spec:** [2026-11-05-eve-chat-navigation-reset.md](../specs/2026-11-05-eve-chat-navigation-reset.md)

## Constraints

- Keep puzzle, scoring, attempts, hint, StoreKit, and deep-link behavior unchanged.
- Use the localized StoreKit price only; keep the one-time purchase wording explicit.
- Do not add or run automated tests. Build and inspect the iOS Simulator manually.

## Implementation tasks

1. [x] Refine `NavigationDrawer.swift` into a compact, clearly grouped sidebar. Shorten destination rows, reduce decorative labels, retain selected-state/accessibility semantics, and redesign the Plus card to show its core value and one-time terms in a compact footprint.
2. [x] Give the daily screen a chat identity in its shared top header, keeping menu and Help accessible.
3. [x] Rework the daily transcript in `TodayView.swift`: compact thread context, Eve prompt with clue attachment, quiet reset metadata, and one compact guess HUD. Keep the clue board full width for readability.
4. [x] Flatten `GuessConversationView` message styling so player guesses read as right-side chat bubbles and Eve feedback/nudges read as clean assistant turns with feedback visible.
5. [x] Preserve keyboard handling, focus, accessibility labels, Dynamic Type layout, Reduced Motion, scroll-follow behavior, and all game data flow.
6. [ ] `git diff --check` and the Debug Simulator build pass. The QA simulator’s device commands hung during install/restart, so the fresh home, drawer, and post-guess screens still need visual review.

## Review focus

- The first open screen looks like a game conversation, not a stack of independent page cards.
- The board remains the visual anchor and is not reduced to unreadable size.
- Player and Eve turns have clear alignment and hierarchy without excessive rounded panels.
- Navigation destinations, Plus routing, dismissal, and keyboard interactions still behave as before.
- No unrelated changes are staged or reverted.
