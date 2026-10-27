# Artwork Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep creator search broad while allowing only explicit supported object readings in new puzzle selection and review.
**Architecture:** One catalog reading policy feeds strict asset resolution, semantic/recognition checks, and creator discovery. Asset geometry and published records stay unchanged; review policy version changes invalidate old approvals for new decisions.
**Tech Stack:** TypeScript, Next.js, React, Jest.
**Spec:** `docs/superpowers/specs/2026-10-26-artwork-readings-design.md`

## Global Constraints
- Preserve current frozen PNG geometry and existing published puzzle records.
- Never treat model assertions, client arrays, or search aliases as reading approval.
- Preserve independently approved generated assets for concepts absent from the curated collection.
- No new model, dependency, production puzzle publication, or iOS binary is needed for this server/editor contract.

## Review Focus
- A spoofed concept or asset ID must not bypass strict identity validation.
- Feature alias fallback must not restore rejected citrus/lemon or cat/kitten equivalence.
- Approved synonyms must retain their requested word in answer-first composition.
- Human confusion labels must remain reportable even when no canonical match exists.
- Catalog semantics changes must invalidate publication evidence without changing old player boards.

### Task 1: Catalog and deterministic semantics
**Files:** `apps/web/src/ai/puzzle-agent/visual/curated-pictograms.ts`, `semantic-alignment.ts`, and their existing tests.
**Interfaces:** Export `CURATED_PICTOGRAM_READING_POLICY_VERSION`, `getCuratedPictogramReadingPolicy(conceptOrAssetId: string)` returning canonicalConcept, assetId, searchAliases, approvedReadings, commonConfusions or null. Keep `resolveCuratedPictogram` strict to approved readings; keep `getCuratedPictogramAliases` as approved-reading compatibility accessor. Policy lookup discovers search aliases but does not authorize them.
- [ ] Write tests: lemon discovery identifies citrus with supported reading citrus and lemon/orange confusions; strict lemon resolution null; bicycle/bike works; cat/kitten rejected; citrus asset relabeled lemon cannot form lemonade.
- [ ] Run focused tests and confirm intended failures.
- [ ] Audit catalog entries into explicit approved readings and confusions; implement strict resolution and asset-authoritative semantic variants without feature-alias bypass.
- [ ] Run catalog and semantic suites; preserve SVG/asset IDs and generated-asset semantics.

### Task 2: Recognition and generation enforcement
**Files:** `visual/icon-features.ts`, `review/icon-recognition-service.ts`, `apex/answer-seed-cues.ts`, `apex/rule-graph.ts`, `visual/generate-pictogram.ts`, agent catalog tools, policy evidence constants and their existing tests.
**Interfaces:** Consume Task 1 policy; preserve requested approved reading while assetId identifies artwork. Non-catalog approved registry artwork remains supported.
- [ ] Add failing tests for citrus/lemon and cat/kitten recognition, feature fallback, retained human confusion labels, unsupported seed/hydration selection, valid synonym composition, and stale evidence.
- [ ] Apply strict identity checks to all named consumers and expose reading policy through both agent catalog tools.
- [ ] Version interpretation/calibration/publication policy where cached evidence depends on it.
- [ ] Run impacted suites; prove old published payloads still return unchanged.

### Task 3: Studio discovery and hydration
**Files:** `app/api/studio/catalog/route.ts`, `components/studio/PuzzleStudio.tsx`, `lib/ugc/visual-hydrate.ts`, existing/new boundary tests.
**Interfaces:** API returns server-owned policy fields beside existing asset data; client search uses searchAliases; selected asset inserts canonical concept deliberately. Hydration checks supplied assetId against requested approved reading and never silently substitutes mismatched art.
- [ ] Add failing real boundary tests for search discovery, policy metadata, unsupported citrus/lemon hydration, spoofed IDs, and approved synonym preservation.
- [ ] Implement inline supported-reading/confusion copy in asset picker; retain draft workflow.
- [ ] Run focused tests, inspect actual Studio picker where feasible, and run web suite/typecheck/lint.

### Release verification
- [ ] Independent code review covering all five review focus items; fix material findings with regression tests.
- [ ] Commit/push owned changes only, update PR206 and attach it.
- [ ] Deploy backend/editor after checks, verify production daily unchanged and reading policy endpoint behavior; no new daily puzzle solely for testing.
- [ ] Record evidence and limits. Continue original artwork and broader workshop roadmap separately.
