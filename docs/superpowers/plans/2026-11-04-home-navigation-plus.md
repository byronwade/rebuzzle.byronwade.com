# Rebuzzle Home, Navigation, and Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the daily iOS puzzle read as a guided conversation, clarify the three main destinations, and keep the localized lifetime offer and purchase action easy to reach.

**Architecture:** Preserve the existing SwiftUI view and StoreKit 2 architecture. Reorder the existing Eve/puzzle content, adjust tab labels, and move the existing purchase presentation into a bottom safe-area offer bar while keeping the feature details scrollable.

**Tech Stack:** SwiftUI, StoreKit 2, existing Rebuzzle theme and components.

**Spec:** `docs/superpowers/specs/2026-11-04-home-navigation-plus-design.md`

## Global Constraints

- Preserve current routes, gameplay state, StoreKit behavior, and product identifier.
- Keep Apple-localized `Product.displayPrice`; never hard-code the simulator fixture price.
- Keep free daily play, hints, and sharing clearly stated.
- Use existing design tokens and support Dynamic Type and keyboard dismissal.
- Do not add or run tests for this change, per user instruction; verify with a Debug build and manual simulator inspection.

## Review Focus

- Dynamic Type can still reach the entire Plus offer and action.
- Store product loading and purchase errors remain visible and retryable.
- Existing Plus owners see their unlocked state and journal action.
- Restore purchases and local-journal storage caveat remain reachable.
- The keyboard accessory still exposes both dismiss and submit actions.

---

### Task 1: Make Today the conversation entry point

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

- [x] Place the existing Eve opening message before the puzzle board for a new round; retain the board, attempt header, hints, feedback turns, and fixed composer.
- [x] Increase the home Plus entry's visual and tap prominence, with copy that identifies Plus and its localized one-time price.
- [x] Keep the existing Plus purchase destination, accessibility, and keyboard behavior.

### Task 2: Clarify primary navigation

**Files:**
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift`
- Modify: `apps/ios/Rebuzzle/Features/ProgressScreen.swift`
- Modify: `apps/ios/Rebuzzle/Features/SettingsView.swift`

- [x] Label the existing three tabs Today, Journey, and Profile without changing their destinations or selection state.
- [x] Use Journey as the Progress destination's navigation title.
- [x] Make the Profile Plus row explicitly identify the one-time offer and its actual benefits.

### Task 3: Focus and strengthen the Plus offer

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/PlusView.swift`

- [x] Hide the global tab bar while Plus is open.
- [x] Keep the three exact feature descriptions and local-journal disclosure in the scrollable content.
- [x] Pin a compact, adaptive offer area to the bottom: lifetime price with localized `displayPrice`, “One-time payment. No subscription.”, primary purchase action, free-play note, and restore access.
- [x] Preserve owner, product-unavailable, loading, error, journal-preview, and legal states.

### Task 4: Verify the user-facing flow

**Files:**
- No additional files.

- [x] Build the Debug iOS Simulator target.
- [x] Inspect Today, the focused composer and keyboard-dismiss action, Journey/Profile tab destinations, and the Plus screen with the StoreKit product loaded on the QA simulator.
- [x] Confirm the tab bar is absent on Plus, the localized price and one-time disclosure remain visible with the purchase action, and no purchase is initiated during verification.

