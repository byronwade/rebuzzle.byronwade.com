# Rebuzzle Home, Navigation, and Plus Implementation Plan

> **For agentic workers:** Implement this focused SwiftUI change in the current worktree and preserve all existing staged, unstaged, and untracked work.

**Goal:** Make the daily puzzle conversation and its three destinations clearer, and make the one-time Plus purchase more discoverable and useful.

**Architecture:** Keep the existing `TabView`, `NavigationStack`s, `AppTab` cases, `TodayView` conversation, `GuessComposer`, and StoreKit 2 `PurchaseStore`. Update labels and local entry points, add the initial Eve message to the existing conversation surface, and reorder the Plus value proposition while retaining existing purchase/restore actions.

**Tech Stack:** Swift 6, SwiftUI, StoreKit 2.

**Spec:** [2026-11-04-home-chat-navigation-plus-design.md](../specs/2026-11-04-home-chat-navigation-plus-design.md)

## Global Constraints

- Preserve puzzle APIs, answer privacy, scoring, hints, reminder behavior, StoreKit identity, all existing user changes, and iOS 18 support.
- Do not add or run automated tests. Build and manually inspect the iOS Simulator app.
- Do not change files outside the focused iOS UI and this plan/spec.

## Files

- Modify `apps/ios/Rebuzzle/App/RebuzzleApp.swift`: use clear Progress/Profile tab labels while keeping `AppTab` route values and navigation stacks.
- Modify `apps/ios/Rebuzzle/Features/ProgressScreen.swift`: match the Progress destination title.
- Modify `apps/ios/Rebuzzle/Features/SettingsView.swift`: present Profile as the destination title and add a clear Plus value/price route while retaining restore and settings.
- Modify `apps/ios/Rebuzzle/Features/TodayView.swift`: add the opening Eve message for an untouched puzzle and a direct Plus route beside the daily date; keep the existing board, thread, keyboard controls, and composer behavior.
- Modify `apps/ios/Rebuzzle/Features/PlusView.swift`: place specific benefits before the purchase action, show the localized one-time price and local-data disclosure before buying, and keep restore, free-play, owned-state, journal, archive, privacy, and terms behavior.
- Update existing `apps/ios/RebuzzleUITests/GameplayUITests.swift` selectors for the renamed tabs, Profile Plus entry, and purchase button; do not add or run automated tests.

## Tasks

### 1. Clarify navigation and make Plus findable

- Change the visible tabs to Play, Progress, and Profile; retain internal enum cases and route IDs.
- Match the Progress and Profile navigation titles to their tab labels.
- Add a Profile Plus card that names past puzzles, journal/notes, solving insights, and the current localized one-time price when loaded; for missing price data, say “One-time purchase” without guessing the amount.
- Keep account/settings/about destinations and Restore Purchases available.

### 2. Make Play read as the daily puzzle conversation

- Show a short Eve greeting only when today has no submitted guesses, explaining that the player can send a guess and Eve will give feedback.
- Add a direct, clearly labeled Plus link beside the daily date; show the localized one-time price when available and an unlocked state for Plus owners.
- Preserve the countdown, board geometry, difficulty, study action, guess counter, answer-blind conversation, hint flow, keyboard dismissal, and fixed composer; the first guess should follow into the new turn automatically.

### 3. Make the one-time Plus value obvious

- Put the concrete replay, journal/notes, and insight benefits before the payment block.
- Keep `Product.displayPrice`, say “One-time purchase. No subscription.”, and use a clear unlock button.
- Move the on-device journal/export disclosure above the purchase button; retain “Daily puzzles, hints, and sharing stay free.”
- Keep restore, owned state, journal preview, archive, privacy, and terms flows working.

### 4. Build and manually inspect

- Build the Debug Simulator app from a clean scratch copy to avoid the shared Xcode container lock.
- Launch on an isolated iPhone simulator and inspect the Play tab before and after a guess, the three navigation destinations, and the Plus page in both StoreKit preview states if available.
- Review `git diff --check` and inspect only the focused diff; do not run automated tests.

## Review Focus

- First-time Play copy is concise and does not claim feedback beyond the existing Eve system.
- Long content remains readable at Dynamic Type sizes and the anchored composer still works with the keyboard.
- The price is localized and the non-consumable is clearly one-time; no placeholder amount appears when StoreKit has not loaded.
- Plus benefits and on-device journal limits are visible before purchase.
- Tab renaming does not alter deep links, saved selected-tab values, or independent navigation stacks.
