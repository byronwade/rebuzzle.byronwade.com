# Rebuzzle Chat-First Navigation Implementation Plan

> **For agentic workers:** Implement the focused SwiftUI navigation and home redesign in the current worktree. Preserve all unrelated staged, unstaged, and untracked work.

**Goal:** Make Rebuzzle open as one polished daily puzzle conversation, with secondary destinations in a useful left drawer.

**Architecture:** Keep the existing three root destinations and `NavigationStack`s, hide the persistent tab bar, and add a custom slide-over drawer. The drawer switches the existing root selection and routes Past puzzles/Plus through the Today stack. The Today screen makes Eve’s opening message, puzzle, guesses, and feedback the visual hierarchy while the existing composer stays anchored.

**Tech Stack:** Swift 6, SwiftUI, StoreKit 2.

**Spec:** [2026-11-05-chat-first-navigation-design.md](../specs/2026-11-05-chat-first-navigation-design.md)

## Global Constraints

- Preserve AppTab cases, puzzle data, StoreKit behavior, deep links, and active user changes.
- Use the current localized StoreKit product price; never display a made-up amount.
- Do not add or run automated tests. Build the iOS Simulator app and inspect it manually.

## Files

- Modify `apps/ios/Rebuzzle/App/RebuzzleApp.swift`: hide the tab bar, overlay the drawer, keep the three root stacks, and route archive/Plus.
- Add `apps/ios/Rebuzzle/Features/NavigationDrawer.swift`: drawer layout, destination rows, Plus value card, and a reusable leading menu button/environment action.
- Modify `apps/ios/Rebuzzle/Features/TodayView.swift`: compact the game header, keep Eve’s opening turn visible, retain the board/countdown/attempts/thread, and add the leading menu button.
- Modify `apps/ios/Rebuzzle/Features/ProgressScreen.swift` and `apps/ios/Rebuzzle/Features/SettingsView.swift`: add the same drawer entry point to the two root destinations.

## Tasks

### 1. Replace bottom-tab navigation with a drawer

- Keep `AppTab.play`, `.journey`, and `.you` and their separate `NavigationStack`s.
- Hide the native tab bar and add a slide-over drawer with Today, Journey, Past puzzles, and Profile & settings.
- Close the drawer from its close control, outside tap, or destination selection; respect Reduce Motion.
- Route Past puzzles to Archive for Plus owners and Plus for other players. Preserve the existing deep-link return behavior and stack reset behavior.
- Add a reusable, accessible menu button to each root destination.

### 2. Make Today a conversation-led game screen

- Remove the large marketing headline and inline Plus capsule from the play surface.
- Keep a compact date label, Eve’s persistent opening message, the puzzle card, countdown, attempt state, chronological guess/Eve thread, and fixed composer.
- Preserve keyboard dismissal, progressive hints, scroll-follow behavior, and completed-result flow.

### 3. Make the drawer’s lifetime offer useful

- Show the three actual Plus benefits and localized one-time price in the drawer’s pinned card.
- When Plus is owned, turn the card into a shortcut to the archive/journal collection.
- Preserve the current Plus page’s purchase, restore, ownership, free-play, and on-device journal disclosures.

### 4. Build and inspect

- Run `git diff --check` on only the focused files and inspect the focused diff.
- Build the Debug Simulator target without running tests.
- Install and inspect the Today screen, open/close drawer, destination selection, non-owner Plus entry, and keyboard/composer placement on an iPhone simulator.

## Refinement pass after simulator review

The user said the current menu and navigation still feel wrong and do not resemble a chat interface. The current screenshot shows a centered app title, circular toolbar controls, a bordered Eve bubble, and a separate countdown card. Update the same target without changing puzzle or purchase behavior.

- [x] Simplify the shared menu button and drawer; remove repeated subtitles, add a Journal destination, widen the drawer, and keep the localized one-time Plus offer pinned.
- [x] Replace the TabView shell with three independent NavigationStacks and use a shared compact header on Today, Journey, and Profile.
- [x] Give the Today thread a compact date/status line, an unboxed Eve opening turn, and an unboxed countdown while retaining the clue board and guess composer.
- [x] Make drawer accessibility modal, hide the covered screen from VoiceOver, and move accessibility focus to Today when the drawer opens.
- [x] Route both Journey return actions through the root Today handler so the play navigation path is cleared.
- [x] Stop presenting the warmup tutorial automatically on first launch; keep it reachable through How to play.
- [x] Rebuild the Debug Simulator app and inspect fresh home and drawer screenshots. Do not add or run automated tests.

Final visual pass: move Profile & settings to the bottom of the drawer above Plus, show the guess count once, and use “Reply to Eve…” in the fixed composer. Release build 1.0.0 (54) uploaded to App Store Connect; Apple is processing it.

## Review Focus

- The drawer does not leave a dim overlay or block gestures after closing.
- Switching drawer destinations preserves each root stack and keeps Today as the default.
- A locked archive always lands on the Plus details page; a Plus owner reaches the archive.
- Long text and large Dynamic Type sizes remain usable without hiding the Plus card or game composer.
- The app still launches from a deep link into Today and preserves the current puzzle session.
