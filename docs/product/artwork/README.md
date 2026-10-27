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

Verification at this checkpoint: 176 suites / 1,025 tests and two byte snapshots passed; TypeScript passed; changed-file lint passed with the existing Biome configuration deprecation. Tests for missing batch membership failed before the new drawings were implemented. Existing committed hashes were compared explicitly before extending the snapshot. These checks establish source integrity and candidate isolation, not human recognition, difficulty, enjoyment, retention, or revenue. None of the 40 original candidates is live. Actual blind recognition and production approval records remain outstanding. The subsequent integration sections document the now-implemented approval and selection paths.

## Original-artwork recognition panel

The admin icon-recognition screen includes an Original artwork candidates cohort: all40 drawings at44px and72px, mixed with bicycle, car and crown controls (86 specimens). Reviewers receive only an opaque fixture identifier, size and sanitized SVG. Complete panels and the existing control qualification are required; five qualified reviewers per fixture are the minimum. Actual human collection is still pending.

The cohort identity hashes the sanitized drawings, asset identities, style and reading policies. Changed drawings or allowed readings invalidate prior fixtures. Answers are scored against the exact original policy, not the Lucide vocabulary; raw competing interpretations are retained. Eligible asset evidence lists exact SVG hashes, reading policy, style and underlying decision references. This is recognition evidence only, not publication approval. Original selection requires the separate audited promotion described below and real qualifying evidence.

The existing generated-artwork registry also now rejects replacement SVGs under old identities and verifies underlying human decisions before reuse. Missing history, stale fixtures, duplicate reviewers or contradictory raw answers invalidate cached approval.

Visual verification: inspected the actual reviewer component using a temporary local fixture at desktop and390×844 in dark mode. The original44px specimen, three cohort buttons and mobile answer controls were legible and usable. Removed a control-object example from the answer placeholder to avoid priming reviewers. The fixture replaced network responses locally; it did not submit recognition decisions. Temporary route/export removed afterward. Signed-in production inspection remains separate.

## Production receipt

Source `861986e3c0447af6911b7a3b76aaa6688ef3e15c` deployed successfully to `rebuzzle.byronwade.com` as `dpl_D28p8nJ5eGiZCeCEKxFET8H9RLjK` (READY). Web CI40432042130 passed lint, typechecking, unit tests and Playwright e2e; preview build also passed. Local final suite:176 suites,1,035 tests,two snapshots. Native CI remained queued; this release changes no native binary.

Production smoke: full public daily puzzle payload, puzzle date, timezone and next reset matched the pre-deploy response exactly. Visual SHA256 remained `9b3b01e79d0f0a45cc2a8be76f8f546444cb0c991c057a4983fa05bcc4b14385`. Anonymous access to `/api/admin/ai/icon-recognition?panel=originals` returned401 with `Admin access required`. Initial deployment-scoped error/fatal log query returned no entries; this is a short observation, not proof of sustained health.

Previous production deployment `dpl_Hv9VZfXtuMJVUZ3eSBctDJEDVEuH` (source4018323) remains the rollback reference if daily delivery or review authorization regresses. No database migration or artwork promotion was performed. Signed-in production panel interaction and actual independent human review remain unverified.

## Audited promotion foundation

A separate authored-artwork promotion service now derives approval solely from the current calibrated report and immutable original manifest. It records the exact SVG hash, style/readings, recognition versions, editor, status version and complete qualified-panel evidence, including controls. Each approval audit entry retains its evidence snapshot. Quarantine blocks new eligibility without changing frozen published boards. Reads recompute recognition eligibility and reject changed artwork/policies or missing qualifying decisions.

The Mongo adapter uses the exact asset identity as its built-in unique `_id`; first inserts handle duplicate conflicts, and later updates compare the status version atomically. This avoids a new unique-index rollout. Service tests exercise missing evidence, stale previews, concurrent approvals, tampered hashes/policies and quarantine. Final validation:177 suites/1,041 tests/two snapshots and TypeScript passed; independent scoped review found no actionable issue.

The foundation now has admin approval/quarantine controls and a protected API. It is now connected to Studio selection and generation in source, as detailed below. The API authenticates the editor and requires a completed originals panel before exposing labels or accepting changes. Actual human evidence remains pending; no production approval records have been created.

Admin controls verification:178 suites/1,048 tests/two snapshots and TypeScript passed; independent scoped review found no actionable issue. Route tests cover unauthenticated/unfinished reviewers, exact asset/version validation, authenticated actor derivation, ignored client evidence, conflict handling and quarantine reasons. The actual component was exercised locally at desktop and390×844 with isolated in-memory responses: approval added history, quarantine required a reason and added its event, and unqualified artwork remained disabled. Temporary fixture/server removed; no production writes performed. This source is included in the subsequent integration release below.


## Approved artwork selection and publication integration

Studio appends eligible originals to its catalog and rechecks their exact identity and supported reading during server hydration. Existing drafts keep explicit legacy identities, and template defaults remain legacy-first. Original semantic rules use their own approved readings rather than borrowing generic object aliases. Deterministic Studio grading accepts the server-verified calibrated human evidence without fabricating model recognition profiles.

New AI compositions prefer approved originals only after fresh pixel and model-recognition checks. The existing rule-graph path uses the same composer. If an original reading breaks semantic support for the intended answer, one bounded legacy pass may restore it before review and rendering. Existing validation failures prevent that retry. Publication verifies exact bytes, style, reading and current approval again; community writes and daily promotion cannot rely solely on an earlier review fingerprint after an asset is quarantined.

Source checkpoint `0fd73fc7d35902f022f04b050535cbe120e2dcd2`: local 180 suites / 1,076 tests / two snapshots, TypeScript and full lint pass (ten existing warnings). Preview `dpl_7ekwhvXaSBErGyQDZBDC5xPo1oX3` is READY. Live editorial evidence is still pending. These implementation tests do not prove human recognition, enjoyment, retention or revenue.


## Integration production receipt

Source `0fd73fc7d35902f022f04b050535cbe120e2dcd2` is live at `rebuzzle.byronwade.com` in READY deployment `dpl_7VY7p8xYuRbu7zzjSz6jfx3oAeRw` (`rebuzzle-mvyxos2hu-wades-web-dev.vercel.app`). Web CI40435787412 passed lint, package/web typechecking, unit tests and Playwright e2e before release. Native CI40435784812 remained in progress; no native binary changed or was uploaded in this release.

Production before/after comparisons matched the full public puzzle, puzzleDate, timeZone and nextPuzzleTime. Daily ID remained `604c4218-eecf-4733-9cd0-76312676bb60`, date2026-10-26, timezoneAmerica/New_York, reset2026-10-27T04:00:00.000Z. Compact sorted-JSON visual SHA256 remained `0ff4d6e9e43ed7adff9c5d5dd9fd4f06c9fb0f33e95a556e10c4b568c2fe11b6` (different serialization from the earlier receipt). Anonymous original-artwork admin and Studio catalog requests returned401. The initial deployment-scoped error/fatal log query returned no entries; this short observation does not prove sustained health.

Rollback reference: `dpl_D28p8nJ5eGiZCeCEKxFET8H9RLjK`, source861986e. No migration, recognition decisions or artwork approval records were created. Real human recognition, editorial promotion, and signed-in production interaction remain pending. Existing published boards are unchanged; candidate drawings are not eligible merely because this code is deployed.
