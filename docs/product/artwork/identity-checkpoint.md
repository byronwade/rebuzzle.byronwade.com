# Identity integration checkpoint

Studio hydration now resolves a supplied released asset identity before looking at its reading. Name-based defaults apply only when no ID is supplied. A regression test substitutes a future clock default and verifies that an explicitly selected legacy clock keeps its original ID and SVG. This test failed before the change and passes afterward.

Catalog authenticity requires an eligible exact ID, an approved reading for that ID, and exact bytes. Unknown versions, quarantined entries and original candidates remain rejected. Material Symbols diagnostic replacements still use the existing includeQuarantined route; they are not made eligible by this change. Semantic alignment v3 treats the original namespace as catalog-owned, so unapproved originals cannot borrow meaning through generic label/feature aliases. The candidate clockwork regression failed before this restriction and passes now.

A SHA256 snapshot of every eligible legacy asset was created before the resolver refactor and remained unchanged afterward. Full web validation: 176 suites, 1,023 tests, two snapshots passed; TypeScript and changed-file lint passed (existing Biome configuration deprecation). Independent scoped review found no actionable regressions.

This completes the legacy identity-preservation foundation. It does not enable original assets, provide recognition evidence, finish the 40-object collection, or change published frozen boards. Evidence-backed original selection remains pending. Current production remains source 4018323; this checkpoint is source work only until separately deployed.

## Remaining collection demand

A read-only source audit counted authored cue occurrences in `apex/phrase-bank.ts` and `reserve-puzzles.ts`: 92 seed cue occurrences and 113 reserve pictogram occurrences overall. These are not runtime usage counts or player preferences; overlapping answers are not deduplicated and some seeds are marked overused.

The next 28 subjects (seed + reserve occurrences) are: fire 3+10; snowflake 4+5; footprints 6+2; dog 5+3; rain 1+7; brain 3+3; fish 4+1; cat 3+2; heart 2+3; bird 1+4; envelope 0+5; hand 2+2; door 1+3; ear 1+3; flower 3+0; wheat 3+0; boat 2+1; music 2+1; star 2+1; tree 1+2; skull 0+3; gift 2+0; camera 1+1; diamond 1+1; egg 1+1; globe 1+1; newspaper 1+1; sprout 1+1. Truck and wrench tie the final six at 1+1. None of these 28 is currently quarantined. Rain must remain distinct from cloud, and boat from waves.

Develop coherent animals/body, nature, and objects batches next. The source ranking identifies useful coverage, not automatic approval of the resulting drawings.
