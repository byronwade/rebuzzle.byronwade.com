# Native Daily Redesign Implementation Plan

> **For agentic workers:** Use executing-plans for implementation and independent bounded view tasks where safe.

**Goal:** Make Rebuzzle a polished compact daily puzzle game.
**Architecture:** Existing observable model and native navigation remain. Presentation-only changes in shared Theme and feature views.
**Tech Stack:** SwiftUI, iOS18, Inter, existing RebuzzleCore.
**Spec:** docs/superpowers/specs/2026-10-26-native-daily-redesign.md

## Global Constraints
- Preserve three guesses and only server-provided feedback.
- Preserve purchase, account and draft lifecycle, safe visual rendering.
- Native iPhone/iPad, Dynamic Type, light/dark, reduced motion and 44pt controls.

## Review Focus
- Keyboard and accessibility text must leave input/submit reachable.
- Long clues must remain readable without hiding semantic composition.
- Completed game must remove submission and keep spoiler-free sharing.
- Unavailable purchase price must never be fabricated.
- Reconciliation must prevent duplicate submissions and retain draft.

### Task 1: Gameplay
- [ ] Edit TodayView.swift compact daily strip/stage/attempts/results without changing model APIs.
- [ ] Preserve accessibility identifiers and meaningful outcome copy.
- [ ] Run existing gameplay UI suite, including large text and loss/win flows.

### Task 2: Secondary screens
- [ ] Edit ProgressScreen.swift, JournalView.swift, PlusView.swift: concise hierarchy, statistics, dense purchase page.
- [ ] Keep pricing dynamic, restore and disclosure, journal account guard.
- [ ] Verify navigation and purchase presentation in simulator.

### Task 3: Foundations and verification
- [ ] Reduce Page gaps to24 and max width600; align shared color/type/control rhythm.
- [ ] Build native app; run runtime/core/UI tests and investigate existing StoreKit intermittency.
- [ ] Inspect iPhone/iPad light/dark screenshots and correct layout issues.
- [ ] Independent code review before commit/PR and release candidate.

## Execution decisions
User explicitly authorized execution without further questions. Existing isolated checkout reused on feat/native-daily-redesign, based on bea4dc9 (includes pending privacy correction). Existing behavioral tests plus visual inspection cover presentation changes; no implementation-mirroring style tests.
