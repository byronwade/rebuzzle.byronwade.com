# Puzzle Club Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for bounded independent work, followed by review.

**Goal:** Ship a distinctive, playful native Rebuzzle experience to the existing TestFlight app.
**Architecture:** Presentation-only SwiftUI components consume existing AppModel, GameSession and JourneyProgress. Retain all service and scoring contracts.
**Tech Stack:** Swift 6, SwiftUI, iOS 18+.
**Spec:** docs/superpowers/specs/2026-10-26-puzzle-club-design.md

## Global Constraints
Preserve puzzle geometry, actual progress, keyboard dismissal, stable accessibility identifiers, reduced motion and Dynamic Type. No new dependency or API change. Existing feature branch and unrelated scorecard edits remain intact.

## Review Focus
- XXXL copy must wrap without obscuring actions.
- Keyboard must dismiss without losing draft.
- Recovered sessions must not fabricate a win or XP.
- Puzzle decoration must not change clue meaning.
- Repeat taps and loading must retain existing disabled/reconciliation behavior.

## Tasks
- [x] Play: revise TodayView presentation, attempt controls, Eve and confirmed result. Keep all business behavior intact. Verify existing gameplay UI tests.
- [x] Journey/theme: add shared display typography and tactile control treatment; create weekly trail and collection layout using existing progress. Verify build and progress tests.
- [x] Inspect simulator ready/wrong/solved/Journey/dark/large-text; fix clipping. Run native tests and independent code review.
- [x] Increment build, archive, upload to existing TestFlight group, verify processing/distribution; record evidence and update PR.

Ruling: Proceed directly with this direction under the user's explicit instruction to build without asking; no prototype selection gate. Continue existing feature checkout to preserve release history.

Review: Independent native code review found no actionable defects. Verify level/title at accessibility XXXL in the screenshot pass. Study puzzle was added as a presentation-only sheet with a regression test for draft and guess preservation. Initial stage shadow was removed after visual inspection showed shadowing on clue glyphs.

Verification: 16 core tests, 28 hosted unit tests and 13 UI tests pass. After screenshot review compacted the masthead and moved Eve into it; focused AX gameplay, Study preservation and full-button tab-bar clearance rechecks all pass. Final signed build 10 archive succeeds. Upload succeeded; processed build10 is linked to the existing automatic internal TestFlight group. See docs/product/native-puzzle-club-release.md.
