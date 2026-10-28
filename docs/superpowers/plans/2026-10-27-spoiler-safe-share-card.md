# Spoiler-safe daily result share card — implementation plan

**Goal:** Give each completed daily puzzle a distinctive Rebuzzle share card and spoiler-safe text fallback, with a native iOS share sheet and no growth or revenue claims.

**Design brief:** `docs/superpowers/specs/2026-10-27-spoiler-safe-share-card-design.md`

**Base:** `538a55f` (`feat/ios-beta-api-config`), a clean linked worktree.

## Constraints and architecture

- Keep the daily puzzle, guesses, ordinary hints, explanation, and sharing free.
- Support iOS 18 and existing project conventions; add no dependencies, backend changes, or StoreKit gates.
- Put a minimal, answer-blind `DailyShareSummary` in `RebuzzleCore`. It may contain only puzzle date, terminal outcome, correctness marks, maximum attempts, and hint count. Keep `GameSession.shareText` as a compatibility property derived from this summary, with generic waiting copy before completion.
- Render a fixed 360×450 point SwiftUI card at 3× using `ImageRenderer`. Export PNG through a `Transferable` payload, with a text representation for destinations that cannot accept images.
- Keep the existing native `ShareLink`; show it immediately after the result card. While rendering or if rendering fails, share the summary's text. A PNG is usable only while its source summary still matches the current result.
- Follow the established Rebuzzle cream/charcoal/blue theme. Use system type, generous contrast, and no answer or raw-guess content.

## Review focus

- An unfinished game must not yield a completed summary or a card.
- Solved and exhausted-attempt outcomes must have distinct, encouraging copy. There is no voluntary give-up outcome in current rules.
- Attempt slots must be ordered by attempt number, include empty unused slots, and tolerate absent or duplicate attempt numbers without leaking guessed text.
- Rendering failure and the initial render interval must retain a functioning text share.
- A previous render must never be shared after the game summary changes.
- The result action should be visible at standard text size without scrolling and remain accessible at larger Dynamic Type sizes.
- Never pass the full `GameSession`, answer, explanation, guesses, puzzle ID, journal, or account data to the renderer or share payload.

## Tasks

### 1. Add the answer-blind Core summary

1. Add `DailyShareSummaryTests.swift` with solved, revealed, unfinished, and duplicate/out-of-order attempt fixtures. Assert ordered correctness marks, empty slots, hint count, distinct outcome copy, and that the public share text excludes puzzle ID, guess strings, answer, and explanation.
2. Run `swift test --package-path apps/ios/Core --filter DailyShareSummaryTests` and observe the expected failure before adding implementation.
3. Add `DailyShareSummary` and `DailyShareOutcome` in Core. Expose `GameSession.dailyShareSummary` only after `gameOver`; derive `GameSession.shareText` from it, preserving generic waiting copy when unfinished.
4. Run the focused test and then the full Core package suite.

**Produces:** An immutable summary safe to use in UI, image, and text representations without giving those components access to session secrets.

### 2. Add the native result card and transfer payload

1. Add renderer tests for exact 1080×1350 PNG dimensions, summary-derived text representation, solved/revealed copy, and no rendered artifact for unfinished input.
2. Run the focused test and observe the expected failure before adding implementation.
3. Add `DailyResultShareCard.swift`: the fixed 4:5 Rebuzzle card, a `MainActor` `ImageRenderer` utility, and a `Transferable` PNG payload with a plain-text representation. Keep all views and render APIs summary-only.
4. Run the focused test and full iOS unit tests.

**Produces:** A deterministic image and text share payload with no added packages or service calls.

### 3. Integrate the result share action

1. Add focused UI coverage asserting the action is reachable immediately after the result card at standard size, is exposed with a useful accessibility label/identifier, and opens the native share sheet.
2. Observe expected failure before changing `TodayView`.
3. Integrate a summary-keyed render task in `ResultView`. Keep text `ShareLink` available until a matching PNG finishes rendering; return to text if rendering fails. Put the action directly after the result card and retain the answer-blind invitation copy.
4. Run the focused UI test on the available iPhone simulator and full iOS suite.
5. Visually inspect the exported card and result screen at standard and accessibility text sizes.

**Produces:** A reachable, spoiler-safe share affordance whose rendered artifact always corresponds to the result currently shown.

## Verification and completion

- `swift test --package-path apps/ios/Core`
- Full `RebuzzleTests` unit suite and focused `GameplayUITests` share test on the iPhone 17 Pro / iOS 26.0 simulator, if available.
- Release build for the app's supported iOS destination.
- Inspect card PNG dimensions and a simulator screenshot at standard and accessibility text sizes.
- `git diff --check` and review the final diff for private-data flow and accidental unrelated changes.
- Report only verified implementation/build/test evidence. Do not claim improved retention, enjoyment, invitations, revenue, or TestFlight availability based on local tests.

## Execution ledger

- Setup: clean isolated `feat/ios-beta-api-config` worktree verified at `538a55f`; design brief read; iOS 18 support confirmed.
- Task 1: complete — missing `dailyShareSummary` API observed RED; summary tests GREEN; Core suite 50/50.
- Task 2: complete — missing renderer/payload observed RED; PNG/text test GREEN on iPhone 17 Pro / iOS 26.0; exact 1080×1350 output visually inspected.
- Task 3: complete — missing result action observed RED; standard-size native share-sheet test 1/1 and accessibility XXXL reachability test 1/1 pass; share sheet now previews the rendered PNG; standard, accessibility-size, and sheet screenshots visually inspected.
- Final verification: Core package suite passed 50/50; signed full Xcode suite passed 98/98 on iPhone 17 Pro / iOS 26.0; final Release simulator build succeeded; `git diff --check` passed. After strengthening the purchase test's readiness signal, that relaunch flow passed again 1/1. The final 1080×1350 card and native share sheet preview were exported from the result bundle and visually inspected.
- Final review: complete — no critical or important findings; the full URL, PNG/text export coverage, stale-summary guard coverage, and account-loaded fixture signal were reviewed and addressed.
- Test-race fix: after app relaunch, the StoreKit UI test waits for `settingsIdentityLoaded`, an identifier present only when `SettingsView` has a player, before tapping account-scoped navigation. The signed serial suite exposed this readiness race once; the final parallel full suite and focused relaunch rerun passed.
- Ruling: UI fixtures use in-memory credentials — fixture setup failed before gameplay because simulator Keychain was unavailable on both iOS 18.2 and iOS 26.0; app UI tests do not exercise secure storage — cost if wrong: those fixtures no longer test Keychain behavior (production credential storage remains unchanged).
