# Original Rebuzzle Ink — candidate batch 1

These 12 editable drawings are a first milestone toward the 40-object collection: clock, key, umbrella, bee, eye, bell, book, house, moon, sun, leaf and lightbulb. Source geometry is authored in `apps/web/src/ai/puzzle-agent/visual/original-pictograms.ts`; it is not imported from the Lucide catalog. Authored means code-authored in this task, not a claim of human illustration or human recognition approval.

Every record is immutable and explicitly candidate-only. Collection, artwork and reading-policy versions are separate. Proposed readings describe the intended editorial vocabulary; they do not constitute recognizability evidence. No runtime generator, Studio endpoint, or publication path imports this collection. Tests confirm current catalog authenticity rejects these identities.

The labeled contact sheet shows 44/48/72/96-pixel samples. Individual PNGs contain no labels and are available for later review; filenames identify concepts, so an answer-blind evaluation must conceal filenames and intended readings. No blind evaluation has been run for this batch. A second code/visual reviewer found no clipping or material consistency issue in the labeled sheet. Clock/key/bell/book/house use dark solid regions; umbrella/eye/leaf retain open paper silhouettes. The renderer's caller-dependent output path was corrected and verified from the repository root.

Regenerate from repo root:

```sh
apps/web/node_modules/.bin/tsx apps/web/scripts/render-original-artwork-sheet.ts
```

Or from `apps/web`:

```sh
pnpm exec tsx scripts/render-original-artwork-sheet.ts
```

Both write here. This script runs offline and performs no registry, database, provider, or publication actions. Its CommonJS-compatible async entrypoint is required by the current tsx setup.

Verification at this checkpoint: two focused suites / 14 tests and one byte snapshot passed; TypeScript passed; changed-file lint passed with the existing Biome configuration deprecation. These checks establish source integrity and candidate isolation, not measured difficulty, human recognition, enjoyment, retention, or revenue. The original collection is not live. Next work is identity-aware hydration and actual evidence-backed eligibility, plus the remaining 28 drawings selected from generator demand.
