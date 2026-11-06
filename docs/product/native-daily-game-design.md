# Rebuzzle native daily game design

## Intent

Make Rebuzzle a distinctive, exceptionally enjoyable one-puzzle-a-day iOS game that players choose to return to and that can earn sustainable revenue. The game should feel rewarding from opening the daily clue through the reveal, and sharing a result should make a friend curious enough to try the same puzzle.

This is a product direction, not a claim that retention, enjoyment, conversion, or profitability has already improved. The current evidence and release gates remain in [the native growth scorecard](native-growth-scorecard.md).

## Product principles

- **One excellent daily moment.** Open straight into the day’s puzzle. Keep the answer, clue relationships, hints, guesses, and completion rules clear and fair.
- **Challenge through reasoning.** Daily puzzles can take thought, but every necessary inference must be supported by the visible board. Do not claim a typical solve time until blind player results support it.
- **Reward without punishment.** Keep streaks, levels, badges, weekly goals, Eve feedback, and the countdown encouraging. A missed day must not cost earned progress or trigger shame, and reminders remain opt-in and stop after completion.
- **Make sharing feel like part of the game.** A completed result should be recognizable, spoiler-safe, attractive in a social feed, and easy to share through the native iOS share sheet.
- **Keep the daily game generous.** Daily puzzles, guesses, ordinary hints, and answer explanations remain free. Do not sell extra attempts, suppress hints, or make paid play necessary to keep a streak.
- **Earn revenue through lasting value.** Rebuzzle Plus is currently a one-time purchase for the personal journal, notes, insights, and archive practice. Keep pricing sourced from StoreKit and avoid introducing subscription or ad friction without evidence that it improves player value and unit economics.
- **Learn from actual play.** Measure starts, confirmed finishes, subsequent-day returns, quality feedback, shares, verified purchases, refunds, and serving costs. Treat ratings and test builds as directional or delivery evidence, not proof of enjoyment or commercial success.

## Current foundation

The iOS app already has a daily scored puzzle, progressive hints, Eve feedback, a keyboard-aware answer flow, result reveal, local XP and levels, streak milestones, weekly goals, a reset countdown, opt-in local reminders, widgets and Siri entry, spoiler-free text sharing, Plus journal and archive practice, StoreKit purchase restoration, and first-party growth reporting. Extend these systems before creating parallel ones.

## Delivery roadmap

### 1. Shareable daily result

Replace the text-only result invitation with a branded 4:5 share image that shows the puzzle date, solve or reveal outcome, guess pattern, hint count, and a clear Rebuzzle invitation. It must never include the answer, explanation, raw guesses, private notes, or authentication information. Share through `ShareLink`, include a useful text representation for apps that do not accept image data, and keep the current spoiler-safe text behavior as a fallback if rendering fails.

### 2. Validate the paid experience in a real beta environment

Provide a separately scoped, publicly reachable beta API for TestFlight StoreKit sandbox transactions. Keep production sandbox rejection enabled. Verify purchase, restore, archive practice, refund handling, and API data isolation on a physical iPhone before representing Plus as tested or enabling the archive in production.

### 3. Improve puzzle quality using player evidence

Continue the daily challenge policy and answer-blind rendered review. Run blind playtests across different familiarity levels, capture hint usage, solve/abandonment outcomes and perceived fairness, and use revisions to address ambiguous images or unsupported reasoning. Keep active solve time separate from elapsed time across visits.

### 4. Measure and tune one change at a time

Establish a release baseline for daily starts and finishes, subsequent-day returns, ratings, shares, verified Plus purchases, refunds, and per-player service costs. Compare defined cohorts and disclose uncertainty for small samples. Do not use notification opens or Plus page views as proxies for retention or revenue.

### 5. Complete release gates

Finish physical-device accessibility and purchase checks, production backend verification, App Store privacy and listing review, screenshots, build signing, external TestFlight approval, and final store review. Track these in [the release checklist](../../apps/ios/Release/Checklist.md); this design does not supersede those gates.

## First implementation slice

Build the result share card in the existing SwiftUI/Core architecture. Create a deliberately answer-blind share summary in `RebuzzleCore` so the renderer receives only the permitted result fields. Keep the share action native, accessible, and resilient when image rendering is unavailable. The current app uses iOS 18 and the Rebuzzle/Thorbis design tokens; no third-party package is needed.

The first slice is implemented in `apps/ios/Rebuzzle/Features/DailyResultShareCard.swift`. The 1080 × 1350 PNG uses a consistent Rebuzzle light palette in both system appearances. Its ShareLink sits directly below the completed-result card, with a text fallback and an explicit accessibility label. The artifact is bound to its source summary so a reused view cannot share an earlier result, and unfinished sessions cannot render a completed-result card. Simulator checks confirmed the native share sheet and its image preview.

## Success evidence

The iOS 26.0 iPhone 17 Pro simulator verified the 4:5, 1080 × 1350 PNG; answer-blind text and image payload; native share-sheet opening; a visible share invitation without scrolling at standard text size; and accessibility-size text layout and reachability. The Core suite passed 49 tests, all three renderer/privacy tests passed, and both focused UI tests passed. The shared image keeps the same branded light treatment when the app is in dark appearance. After a future TestFlight distribution, measure share actions and subsequent installs/returns where existing privacy and analytics constraints allow. Do not call this feature a growth win until real cohort evidence supports that claim.
