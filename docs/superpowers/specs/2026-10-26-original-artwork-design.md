# Original Rebuzzle Ink collection

## Product intent

Give the daily game a recognizable authored illustration language while preserving fair, legible clues. Original artwork is part of the user's workshop roadmap, alongside canonical geometry, publication evidence, semantic relationships, targeted generation, and measured player outcomes. This collection must not imply those other requirements are finished.

## Visual direction

Extend the existing ink-pictogram-v1 language using editable SVG sources, not Lucide path adaptations or raster tracing. Use the existing ink, paper, mist, and restrained teal palette. At a 64-unit viewBox, retain rounded 2.25-unit primary strokes and 6–8 units of breathing room. Prefer closed silhouettes, a small dark solid region, and two or three identifying interior marks. Avoid ornamental faces and marks that could become accidental clues. Consistent optical mass matters more than identical bounding boxes.

Objects use deliberate views: clocks face-on; keys side-on; animals in profile; vessels show their opening. No perspective distortion or decorative rotation. Each asset must remain identifiable at 44, 48, 72, and 96 pixels. Colors belong to the object only when they carry a required reading; brand theming must not alter clue-bearing colors.

## Collection and delivery

The initial complete collection target is 40 useful objects. Develop and review coherent batches, beginning with clock, key, umbrella, bee, eye, bell, book, house, moon, sun, leaf, and lightbulb. These are familiar concrete readings and include the style guide's reference subjects. A first batch is a milestone, not completion of the collection.

Preserve editable geometry, authored provenance, style version, immutable asset identity, approved readings, search aliases, and common confusions. Catalog metadata is an editorial contract, not evidence that a human or model recognized the drawing. Candidate artwork must not be marked approved simply because it exists in source control.

## Identity and approval records

Keep three independent versions: each immutable artwork version (changes when SVG bytes change), the collection version (changes when membership changes), and the reading-policy version (changes when permitted readings change). An approval record must bind asset identity, sanitized SVG hash, style version, recognition-policy version, and actual review evidence references. Authoring a TypeScript entry with an approved flag is not a promotion mechanism.

Use the existing audited server-side recognition/registry workflow to establish approval; connect authored provenance explicitly rather than relabeling it as generated. Only a successful evidence-backed transition may enable an exact asset version for new puzzle selection. Missing, stale, quarantined, or mismatched evidence leaves it a candidate. Inspection contact sheets and source-control review are additional editorial evidence, not substitutes for the current production recognition gate.

## Integration requirements

Newly selected approved original art should eventually be the default where available. Legacy Lucide identity and bytes must remain resolvable for existing drafts and published puzzles. A changed SVG is a new asset version. Hydration and review must honor the supplied identity, rather than resolving a concept to whichever art is newest. Unknown versions and concept/asset mismatches fail validation for new publication; existing published frozen boards remain untouched.

Keep the existing answer-blind rendered review and asset recognition process. Publication evidence binds the exact artwork and renderer/policy versions. Original artwork cannot bypass quarantine, human calibration rules, or visual evidence requirements. UI controls can continue using Lucide.

## Acceptance evidence

- Inspect a labeled contact sheet for family consistency and separate unlabeled renders for recognizability; inspect at all four target sizes (including the existing 44/72-pixel recognition profiles) on paper and within the dark-mode picker.
- Record actual reviewer observations and competing readings. Do not describe automated structural checks as human recognition evidence.
- Test old identity byte stability, explicit version resolution, approved synonyms, rejected confusions, unknown versions, and mismatched labels.
- Exercise real generator, Studio hydration, semantic review, and publication-evidence consumers before enabling original art as a default.
- Verify published daily payload and frozen board remain unchanged across release.
- Keep candidate assets unavailable to automated production selection until their required review evidence exists.

## Limits

This work does not train a model, expand paid advantages, create extra scored daily puzzles, or establish improved retention or revenue. It supports clear and satisfying puzzle reasoning; player outcomes still require beta and production evidence.
