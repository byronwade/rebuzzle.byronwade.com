# Canonical Daily Board Parity

## Intent

Make the daily puzzle players see use the same reviewed pixels that the playtest and visual-review systems evaluated. Rebuzzle already has a canonical board compiler with verified desktop and phone PNG profiles, a public serializer that preserves those profiles, and an iOS view that selects the matching raster. The ordinary daily candidate path currently stores and reviews the source layers without the compiled artifact, so iOS falls back to a separate native layout.

## Goals

- Compile the candidate's canonical board before its first human playtest submission.
- Persist the compiled visual on the candidate and send that same visual to the playtest renderer.
- Keep retried, unsubmitted candidates on the same canonicalization path.
- At publication, rebuild from trusted source layers and verify any stored artifact still matches. Persist and return the exact canonical visual that passed review.
- Fail closed when a visual cannot be compiled or a stored artifact differs from its source; do not publish a board whose pixels reviewers did not evaluate.
- Preserve the existing public API compatibility gate and iOS raster selection behavior.

## Data and rendering rules

- `compileCanonicalBoard` removes any incoming artifact and compiles profile rasters from the validated source layers.
- `renderPuzzleVisualProfile` and the canonical compiler use the same Sharp renderer. Existing canonical-board tests establish byte-identical output for every profile when an artifact is attached.
- When a candidate has no artifact, adding the compiler output after legacy playtest review is safe only because the same profile renderer produced those reviewed pixels. If a candidate already has an artifact, the publisher must verify it equals the fresh compilation; a mismatch invalidates the prior review.
- The daily public serializer already preserves the canonical profile variants. `/api/puzzle/today` already requires `X-Rebuzzle-Canonical-Board: 1` for artifact-bearing puzzles, and the current iOS API client sends that header.

## Scope

- Update daily candidate queueing so new and still-unsubmitted candidates are compiled and persisted before playtest submission.
- Add a compare-and-set repository operation to replace a candidate payload only while it remains in `reviewing` and has no playtest submission.
- Update the reviewed publisher to verify the source/artifact match, persist the canonical visual, and return it on the first public response.
- Add tests for canonicalized queue payloads, retry behavior, publication preservation, mismatch rejection, and the public visual serializer.

## Non-goals

- Change board geometry, the Sharp renderer, puzzle generation prompts, scoring, or playtest thresholds.
- Change the Studio editor's device preview or redesign the SwiftUI screen.
- Rewrite older published puzzle rows in MongoDB.

## Success evidence

- A newly queued candidate stores and submits a visual with verified desktop and all supported phone rasters.
- A pending candidate is updated only while it remains unsubmitted; an already-reviewed candidate is never silently rewritten.
- The publisher persists and returns the same compiled artifact, rejects source/artifact mismatches, and can continue to another candidate.
- Public serialization retains the profile variants, and the existing API compatibility tests continue to pass.
