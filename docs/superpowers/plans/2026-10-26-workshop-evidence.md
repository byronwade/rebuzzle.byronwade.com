# Workshop Evidence Implementation Plan

> **For agentic workers:** Use subagent-driven-development for bounded modules, then independent review.

**Goal:** Make new publication approval require complete board evidence and provide a frozen cross-platform board contract.
**Architecture:** Server-owned optional canonical PNG on PuzzleVisual, reviewed at scaled profiles; strict evidence identity/policy in Studio; native optional reader. Legacy published boards stay untouched.
**Tech Stack:** TypeScript/Next.js/Mongo/Sharp, SwiftUI/Swift6.
**Spec:** docs/superpowers/specs/2026-10-26-workshop-evidence-design.md

## Global Constraints
No changes to published daily data. Never trust client approval/artifact. No silent rendering omissions. Existing native models remain backward compatible. Preserve unrelated scorecard edits. No fine tuning or fabricated editorial corpus.

## Review Focus
Provider unavailability is pending; profile completeness is mandatory; source/asset mutations invalidate evidence; concurrent draft save cannot attach stale review; malformed image data must not fall back to different geometry.

## Tasks
- [x] Canonical presentation: bounded schema/compiler and review profile scaling; web canonical rendering/Studio reviewed preview; regression fixtures.
- [x] Publication evidence: mandatory critique/vision, pending status, identity and persistence invalidation, lottery gate, regression tests.
- [ ] Native canonical reader and integrity tests, existing gameplay suite, screenshots and TestFlight update.
- [ ] Integration review, web tests/typecheck/lint, release verification and honest roadmap receipt.

Ruling: Follow the user's standing instruction to implement without routine approval. Separate original art and richer editing workstreams rather than claim this release completes the whole workshop roadmap.
