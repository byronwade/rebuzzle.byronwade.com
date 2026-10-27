# Original Rebuzzle Ink — 40-object candidate collection

The source-demand collection now contains 40 editable drawings. Collection revision v3 adds 28 nature, animal/body and object clues to the initial 12. Every earlier asset hash is unchanged. Source geometry lives in `apps/web/src/ai/puzzle-agent/visual/original-pictograms.ts`; it is code-authored in this task, not imported from Lucide and not a claim of human illustration or human recognition approval.

Current review sheets: [page 1](original-candidates-v3-page-1.png), [page 2](original-candidates-v3-page-2.png), [page 3](original-candidates-v3-page-3.png), [page 4](original-candidates-v3-page-4.png). The full SVG/PNG sheet and earlier revision sheets are retained. Selection of the additional subjects follows the authored seed/reserve demand audit in `identity-checkpoint.md`, not measured player preferences.

Every record is immutable and explicitly candidate-only. Collection, artwork and reading-policy versions are separate. Proposed readings describe the intended editorial vocabulary; they do not constitute recognizability evidence. No runtime generator, Studio endpoint, or publication path imports this collection. Tests confirm current catalog authenticity rejects these identities.

The labeled contact sheets show 44/48/72/96-pixel samples for all 40 candidates, with 160 separate PNG size samples. Individual PNGs contain no labels and are available for later review; filenames identify concepts, so an answer-blind evaluation must conceal filenames and intended readings. No blind evaluation has been run for this batch. Independent code/visual review inspected all four current pages and found no clipping or material rendering issues; it confirmed exactly 28 new identities and 12 unchanged hashes. Clock/key/bell/book/house use dark solid regions; umbrella/eye/leaf retain open paper silhouettes. The renderer's caller-dependent output path was corrected and verified from the repository root.

Regenerate from repo root:

```sh
apps/web/node_modules/.bin/tsx apps/web/scripts/render-original-artwork-sheet.ts
```

Or from `apps/web`:

```sh
pnpm exec tsx scripts/render-original-artwork-sheet.ts
```

Both write here. This script runs offline and performs no registry, database, provider, or publication actions. Its CommonJS-compatible async entrypoint is required by the current tsx setup.

Verification at this checkpoint: 176 suites / 1,025 tests and two byte snapshots passed; TypeScript passed; changed-file lint passed with the existing Biome configuration deprecation. Tests for missing batch membership failed before the new drawings were implemented. Existing committed hashes were compared explicitly before extending the snapshot. These checks establish source integrity and candidate isolation, not human recognition, difficulty, enjoyment, retention, or revenue. None of the 40 original candidates is live. Actual blind recognition, audited eligibility records and approved original selection remain outstanding.

## Original-artwork recognition panel

The admin icon-recognition screen includes an Original artwork candidates cohort: all40 drawings at44px and72px, mixed with bicycle, car and crown controls (86 specimens). Reviewers receive only an opaque fixture identifier, size and sanitized SVG. Complete panels and the existing control qualification are required; five qualified reviewers per fixture are the minimum. Actual human collection is still pending.

The cohort identity hashes the sanitized drawings, asset identities, style and reading policies. Changed drawings or allowed readings invalidate prior fixtures. Answers are scored against the exact original policy, not the Lucide vocabulary; raw competing interpretations are retained. Eligible asset evidence lists exact SVG hashes, reading policy, style and underlying decision references. This is recognition evidence only, not publication approval. Original selection remains disabled until a separate audited promotion is implemented and real evidence qualifies.

The existing generated-artwork registry also now rejects replacement SVGs under old identities and verifies underlying human decisions before reuse. Missing history, stale fixtures, duplicate reviewers or contradictory raw answers invalidate cached approval.

Visual verification: inspected the actual reviewer component using a temporary local fixture at desktop and390×844 in dark mode. The original44px specimen, three cohort buttons and mobile answer controls were legible and usable. Removed a control-object example from the answer placeholder to avoid priming reviewers. The fixture replaced network responses locally; it did not submit recognition decisions. Temporary route/export removed afterward. Signed-in production inspection remains separate.

## Production receipt

Source `861986e3c0447af6911b7a3b76aaa6688ef3e15c` deployed successfully to `rebuzzle.byronwade.com` as `dpl_D28p8nJ5eGiZCeCEKxFET8H9RLjK` (READY). Web CI40432042130 passed lint, typechecking, unit tests and Playwright e2e; preview build also passed. Local final suite:176 suites,1,035 tests,two snapshots. Native CI remained queued; this release changes no native binary.

Production smoke: full public daily puzzle payload, puzzle date, timezone and next reset matched the pre-deploy response exactly. Visual SHA256 remained `9b3b01e79d0f0a45cc2a8be76f8f546444cb0c991c057a4983fa05bcc4b14385`. Anonymous access to `/api/admin/ai/icon-recognition?panel=originals` returned401 with `Admin access required`. Initial deployment-scoped error/fatal log query returned no entries; this is a short observation, not proof of sustained health.

Previous production deployment `dpl_Hv9VZfXtuMJVUZ3eSBctDJEDVEuH` (source4018323) remains the rollback reference if daily delivery or review authorization regresses. No database migration or artwork promotion was performed. Signed-in production panel interaction and actual independent human review remain unverified.
