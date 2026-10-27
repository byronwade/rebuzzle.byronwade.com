# Original Rebuzzle Artwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cohesive original 40-object collection through the existing recognition gates, preserving every prior puzzle's artwork identity.
**Architecture:** Immutable authored SVG candidates are separate from approval evidence. Identity-aware resolution preserves Lucide and older original versions; evidence-backed selection enables exact reviewed original versions for new puzzles. Frozen canonical boards remain unchanged.
**Tech Stack:** TypeScript, SVG, Jest, existing server registry and recognition workflows.
**Spec:** `docs/superpowers/specs/2026-10-26-original-artwork-design.md`

## Global Constraints
- No replacement of existing SVG bytes or read-time migration of published boards.
- Keep artwork, collection, and reading-policy versions independent.
- Candidate existence is not approval; no source-controlled boolean may fabricate recognition evidence.
- Inspect 44/48/72/96 pixels; production recognition profiles remain 44/72.
- Use the existing authored style and current publication gates, not another generation pipeline.

## Review Focus
- Old drafts retaining an explicit old ID after the default changes must keep the same bytes.
- Search aliases and competing interpretations must not become approved readings.
- A legitimate ID paired with different bytes must fail authenticity.
- Missing, stale, quarantined, or wrong-version approval must exclude a candidate.
- Public unsolved payloads must not expose recognition answers or internal readings.

### Task 1: Immutable authored candidates and visual review
**Create:** `apps/web/src/ai/puzzle-agent/visual/original-pictograms.ts`, sibling `__tests__/original-pictograms.test.ts`, and an offline contact-sheet artifact under `docs/product/artwork/`.
**Interface:** `listOriginalPictogramCandidates()` returns immutable candidate records with assetId, artworkVersion, collectionVersion, styleId, concept, approvedReadings, searchAliases, commonConfusions, SVG, and authored provenance. The name approvedReadings denotes the editorial vocabulary contract only; it grants no production approval. New IDs use `rebuzzle-ink:<concept>:v1`.
- [ ] Add tests for unique exact IDs, immutable byte snapshots, SVG sanitization, palette/viewBox/padding constraints, and candidate-only state.
- [ ] Verify failures, then author the first12 subjects specified in the design as original geometry, retaining editable paths.
- [ ] Generate labeled contact sheets and separate unlabeled tiles at all target sizes. Inspect shape recognition and family consistency; record observed confusions and revise geometry where necessary.
- [ ] Review and commit the candidate batch. Expand the same process to40 objects; choose remaining subjects from actual generator demand before claiming collection completion.

### Task 2: Resolve exact catalog identity
**Modify:** `visual/curated-pictograms.ts`, `lib/ugc/visual-hydrate.ts`, `semantic-alignment.ts`; their existing tests.
**Interface:** Add explicit identity lookup separate from concept-default lookup. Preserve the existing resolver's return shape for callers. A supplied identity determines bytes and permitted readings; concept-only lookup is for newly requested artwork.
- [ ] Pin tests for exact legacy byte stability, old-ID hydration when a different default exists, unknown versions, spoofed SVG, approved synonym preservation, and discovery-only reading rejection.
- [ ] Implement identity lookup and authoritative reading lookup for the original namespace without allowing candidate publication.
- [ ] Update hydration to resolve supplied identity first, then check the requested reading. Update semantic review to use the identity's reading contract for both namespaces.
- [ ] Run hydration, semantics, quality, publication-assets and rubric tests. Independently review the identity boundary before committing.

### Task 3: Evidence-backed promotion and selection
**Modify:** `visual/generated-pictogram-registry.ts`, `review/icon-recognition-service.ts`, `visual/generate-pictogram.ts`, catalog API and both agent catalog tools. Extend authored provenance explicitly; do not call authored artwork generated.
**Interface:** Reuse audited registry approval transitions, binding exact authored asset ID, sanitized SVG hash, style and recognition-policy versions, and evidence references. An approved original lookup must return only a currently eligible exact version. A candidate source file is never a substitute for this lookup.
- [ ] Add failing boundary tests for absent/stale/wrong-hash/quarantined approval, candidate exclusion, and successful exact-version promotion with real-shaped evidence.
- [ ] Connect authored candidates to the existing review workflow. No synthetic production approval records.
- [ ] Prefer an eligible original for new concept-only requests; keep explicit old IDs unchanged. Expose only eligible selection options to Studio and generation.
- [ ] Version approval-dependent evidence policy; test invalidation and public metadata projection. Run the complete web test suite, typecheck and lint.

### Task 4: Release and editorial completion
- [ ] Obtain required actual recognition evidence for each promoted asset; retain rejected candidates and paired revisions with reasons.
- [ ] Inspect Studio selection and actual player/canonical renders; compare stored canonical PNGs and public daily responses before/after release.
- [ ] Independently review integration, push reviewed source, wait for applicable CI and deploy exact tested commit.
- [ ] Record promoted coverage, pending candidates, review evidence and production receipt. Do not claim the40-object goal, improved enjoyment, or retention from a partial batch or structural test results.
