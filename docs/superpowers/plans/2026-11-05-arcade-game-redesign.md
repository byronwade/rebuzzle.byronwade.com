# Arcade Game Redesign Plan

## Scope

Implement the research-backed Arcade hub, shallow navigation, and game-focused daily screen using the current API and StoreKit contracts. Keep the existing archive catalog and one-puzzle practice sessions. Do not invent a persistent arcade score, free archive access, or new backend contract.

## Steps

1. Add a native Arcade landing screen with the real daily puzzle board as its feature artwork, a three-guess HUD, live round status, streak/progress snapshot, clear archive/Plus value, and a direct play action. Use solid Rebuzzle surfaces and its existing cobalt accent.
2. Convert the top-level shell to three plain destinations: Arcade, Journey, and You. Remove the drawer from the active user flow and retain each tab’s navigation stack.
3. Route the daily challenge from Arcade and Journey into the existing server-owned daily session. Replace the menu/chat header with a focused game HUD and home control.
4. Keep Eve attached to actual guesses; remove the pre-game chat opener. Use the actual board in the Arcade feature card and gameplay stage while retaining study, hints, countdown, keyboard dismissal, and result reveal.
5. Keep Plus/archive claims exact: lifetime access to past puzzle replays, private journal, and solve-pattern insights; daily play remains free.
6. Build the iOS simulator app, check the patch whitespace, and inspect the resulting iPhone layout if the simulator session is healthy. Do not run automated tests.

## Review checkpoints

- Before implementation: confirm the server endpoints do not provide a scored multi-round arcade mode. This was confirmed: practice is Plus-only, past-puzzle-only, answer-blind, unscored, and tokenized per puzzle.
- After implementation: review the tab route behavior, accessibility labels and hit targets, StoreKit pricing source, and a simulator screenshot. Record simulator limitations if visual inspection cannot be completed.

## Risks

- Existing worktree contains unrelated staged, unstaged, and untracked user changes. Touch only the SwiftUI navigation/game files and the two redesign documents; do not stage, revert, or clean the worktree.
- The archive API only allows Plus users to replay already-published puzzles. Do not imply it is an open/free mode.
- No automated tests are authorized by the repository-level developer instruction for this session; verification is through compilation, diff review, and visual inspection.
