# Artwork readings and fair clue selection

## Intent

Implement the workshop recommendation to separate creator discovery from puzzle meaning. A player should reason from the visible board, not guess which hidden catalog alias the author meant. This contributes to fair difficulty and a recognizable reusable artwork collection; it does not claim measured enjoyment or replace visual review.

## Required behavior

- Catalog assets have explicit approved puzzle readings, creator search aliases, and common confusions. Search may find an asset using a confusion or alias, but puzzle generation must select only an approved reading.
- A generic citrus slice must not silently stand in for a specific lemon or orange. Existing synonyms that are visibly supported (for example bicycle/bike) may remain approved deliberately; broad associations must not become approved by default.
- Structured generation, pictogram hydration, and publication review must agree on this distinction. Metadata is not evidence of recognizability; existing answer-blind pixel review remains required.
- Studio lets creators discover assets using broad search and explains supported readings and ambiguity before publication. Warn on unsupported requested readings; do not silently relabel or swap clue-bearing art.
- Published puzzles and their frozen canonical images are not rewritten. Draft saving remains possible. New reviews must not reuse stale evidence after relevant artwork semantics change.
- Missing or legacy metadata must fail conservatively for new automated selection, while old published content remains renderable.
- Keep public unsolved puzzle payloads free of internal intended-answer/reasoning/review metadata.

## Implementation decisions

Use the existing TypeScript catalog, Studio, and AI pipeline. Keep existing assets and IDs; this phase prepares approved original illustrations without falsely calling current Lucide assets original Rebuzzle art. Audit readings across the current curated catalog rather than only special-casing citrus. Preserve provenance/version identity where the pipeline already supports it.

Thorbis guidance informs the Studio presentation: plain inline explanations, one clear action, quiet chrome, explicit pending/failed states, and no decorative dashboard of equal buttons. Puzzle artwork retains clue-bearing colors and treatments.

## Acceptance

Tests must demonstrate broad creator search still finds citrus for lemon/orange, strict new-puzzle selection refuses unsupported exact readings, supported synonyms still work, generator/hydration/review cannot bypass the distinction, and legacy published rendering remains stable. Review evidence invalidation and public metadata boundaries need explicit coverage. Inspect real Studio presentation if its UI changes. Run the complete web test suite, typecheck, and lint; independently review the change before deployment.

Original Rebuzzle illustrations, semantic relationships, targeted AI edits, and the larger editorial benchmark remain part of the overall roadmap. This is the reading contract they will rely on, not a claim that the complete artwork priority is finished.
