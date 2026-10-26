# Plus Value Preview Implementation Plan

> Use superpowers:executing-plans and the already-loaded SwiftUI UI patterns.

Goal: Make the existing one-time Plus offering concrete using the player's actual completed puzzle, without adding pay-to-win advantages or interrupting daily play.
Architecture: PlusView composes a read-only actual journal entry preview and routes entitled players directly to JournalView. Existing StoreKit purchase/restore remains authoritative. No fabricated example progress or changes to pricing.

- [x] Add UI test completing a puzzle, opening Plus from Journal, and seeing the real completed answer in a labeled preview; observe failure.
- [x] Implement actual-entry preview, concise purchase value copy and an entitled journal navigation action. Empty accounts see benefit copy, not invented history.
- [x] Run affected UI test and existing purchase/runtime suite. Inspect paywall screenshot, update branch and release evidence.

Review: account changes must use the current journal, preview only completed answers, no duplicate purchase UI, local-only data disclosure retained. Author implementation/review; agent dispatch was previously rejected by session limit. Continue dedicated feature checkout under existing user authorization. This iteration does not prove revenue/retention; real-device StoreKit and release/measurement remain goal requirements.
