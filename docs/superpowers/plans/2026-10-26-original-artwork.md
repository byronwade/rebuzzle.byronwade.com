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
**Modify:** `review/generated-pictogram-registry.ts`, `review/icon-recognition-service.ts`, `visual/generate-pictogram.ts`, catalog API and both agent catalog tools. Extend authored provenance explicitly; do not call authored artwork generated.
**Interface:** Use a dedicated authored-candidate panel in the existing calibrated recognition service, binding exact authored asset ID, sanitized SVG hash, style and reading/recognition-policy versions, and actual decision references. Retain its five-reviewer, qualified-control and per-size recognition standards. Use disjoint controls and asset-based aggregation so an original and a Lucide drawing cannot share approval. A separate audited promotion must bind this evidence before original selection becomes eligible. A candidate source file or panel report alone is never publication approval. Harden the generated registry independently; do not relabel authored art as generated or silently substitute its three-reviewer standard.
- [ ] Add failing boundary tests for absent/stale/wrong-hash/quarantined approval, candidate exclusion, and successful exact-version promotion with real-shaped evidence.
- [ ] Connect authored candidates to the existing review workflow. No synthetic production approval records.
- [ ] Prefer an eligible original for new concept-only requests; keep explicit old IDs unchanged. Expose only eligible selection options to Studio and generation.
- [ ] Version approval-dependent evidence policy; test invalidation and public metadata projection. Run the complete web test suite, typecheck and lint.

### Task 4: Release and editorial completion
- [ ] Obtain required actual recognition evidence for each promoted asset; retain rejected candidates and paired revisions with reasons.
- [ ] Inspect Studio selection and actual player/canonical renders; compare stored canonical PNGs and public daily responses before/after release.
- [ ] Independently review integration, push reviewed source, wait for applicable CI and deploy exact tested commit.
- [ ] Record promoted coverage, pending candidates, review evidence and production receipt. Do not claim the40-object goal, improved enjoyment, or retention from a partial batch or structural test results.

## Task 3 implementation finding (2026-10-26)

The generated registry's content-addressed IDs and three-person unanimous panel are not interchangeable with the calibrated candidate panel. The latter already supports controls, five reviewers and per-size thresholds. Extend that panel for authored candidates, score raw answers against each exact original reading policy, and retain distinct evidence-backed promotion. This preserves stricter recognition standards without dual-registering the same artwork under competing identities.

Before this integration, a regression in generated approval lookup was reproduced: replacing both SVG and stored hash retained approval under the original identity. Lookup now verifies the content-derived ID and underlying unique current-policy human decisions, including raw answer, fixture and both sizes. Six regression cases failed before the fix. This does not approve any original candidates or change published frozen boards.

## Publication verification integration (2026-10-26)

The shared publication asset verifier now handles authored `rebuzzle-ink:` identities separately from generated-registry assets. It requires exact manifest bytes, style, versioned identity and a permitted reading, then checks current audited promotion eligibility. A later quarantine or unavailable approval service prevents verification. Search aliases and common confusions do not grant readings. Legacy catalog verification is unchanged.

Verification: two positive/revocation cases failed before implementation; all 10 publication-asset cases now pass. Full web suite: 178 suites, 1,055 tests, two snapshots. TypeScript passed; scoped Biome passed with the existing configuration deprecation notice. Independent review found no actionable defects.

This is a publication-boundary step only. Studio hydration/catalog selection, generator preference, semantic integration, and rechecking at community/daily publication remain pending. No original artwork has been approved or deployed by this change.

## Publication call sites (2026-10-26)

Community puzzle creation and refresh now require matching review evidence and current asset verification before writing. Daily lottery promotion also verifies the stored board, preventing later asset quarantine from being hidden by cached review evidence. The verifier accepts the stored visual type without forcing unrelated text-emphasis defaults or changing board bytes.

Four regression cases failed before implementation (new community row, refresh, missing review evidence, stored daily board). Validation: 178 suites, 1,059 tests and two snapshots pass; TypeScript passes; scoped Biome passes with the existing deprecation notice. Independent review found no actionable defects. No production mutation or deployment was performed. Remaining integration: original selection/hydration, semantics, generator preference and actual editorial qualification.

## Studio original selection integration (2026-10-26)

The Studio catalog appends currently eligible originals, preserving legacy-first template defaults. Async server hydration replaces client bytes with the exact approved original version and preserves supported concept wording and placement. Unknown versions, unsupported readings and unavailable/revoked approval produce blocking issues. The original semantic branch uses only exact manifest readings (semantic-alignment-v4); legacy mechanism aliases are intentionally not inherited.

Hydration returns verified original asset IDs directly to deterministic grading, where the calibrated human review satisfies the recognition requirement without fabricated model profiles. This server-derived list is never accepted from request metadata. Publication still independently rechecks eligibility. An integrated original sun + flower grading test passes with approval and fails after withdrawal.

Validation: 180 suites / 1,069 tests / two snapshots; TypeScript and scoped Biome pass (existing configuration deprecation only). Independent review found no actionable trust-boundary defects. Original catalog and hydration tests cover unavailable approval, unknown versions, confusion readings, mixed-board order and legacy bytes. No production approvals or deployment. Generator preference and live editorial qualification remain pending; existing templates deliberately keep legacy defaults until generator/reading integration is complete.

## Generator integration (2026-10-26)

New concept requests prefer an exact approved original reading only after current promotion lookup, player-size pixel integrity and fresh model recognition. Failed or unavailable approval/recognition falls back to the existing catalog. Offline skip-recognition runs retain their registry-independent behavior. Generated provenance is not assigned to authored artwork.

The existing rule-graph preflight already materializes every pictogram through the shared composer, so no second artwork swap pipeline was added. The composer checks whole-board semantic support before review/rendering. When original readings lose an established interpretation (lightbulb → light in lighthouse), one bounded legacy pass can restore support. That retry is allowed only when there are no first-pass validation issues, preserving malformed-image errors found during independent review.

Validation: 180 suites / 1,076 tests / two snapshots; TypeScript and full web lint pass (ten existing warnings plus configuration deprecation). Tests cover original preference, unavailable approval, failed fresh recognition, discovery-only readings, actual graph preflight, semantic fallback and preserved validation errors. A previously committed admin-route formatting error that blocked CI was also fixed. No artwork was promoted and no production deployment occurred in this step. Actual editorial recognition and post-CI release remain required.
