# Workshop evidence and canonical boards

The supplied review is the roadmap. This first release implements dependable publication evidence and a versioned board presentation; original artwork, semantic relationship editing, Apex Studio proposals and the editorial corpus remain subsequent workstreams. No training is started and no human approval or player enjoyment is fabricated.

## Contract
New approved Studio boards retain editable layers and a server-compiled canonical PNG presentation. The same immutable image bytes are evaluated and displayed by web/native clients, aspect-fit without clue recoloring. Use an optional `canonicalBoard` field containing version, PNG data URL, SHA256, width/height and source fingerprint. Inline bounded PNG avoids mutable remote art and new storage infrastructure. Never accept a client-supplied artifact as approval. Existing published puzzles without this field keep their existing rendering.

Server compilation must fail if any image cannot be represented; it must not silently omit remote layers. Captions and semantic colors are part of the artifact. Review profiles scale the frozen board, never independently reflow it. Review identity includes hydrated source content, exact artifact/asset bytes, answer, hints, explanation, difficulty, technique and renderer/policy versions. No approval reuse after identity changes.

Publication always requires actual board-aware critique and complete answer-blind per-profile evidence. Skipped, disabled, unavailable or incomplete providers yield Review pending (ok false), not ship. Structural failures remain revise/reject. Drafts remain savable; modified drafts clear old review/grade. Daily promotion additionally requires matching complete evidence and retains all existing demanding-puzzle gates. Existing approved community puzzles remain readable.

Studio displays the evaluated canonical preview after review; changes invalidate it and require another review. Full direct manipulation atop canonical geometry is a later phase unless it can be implemented without compromising edit semantics. Do not claim the live editable canvas has full parity merely because reviewed preview does.

Native supports optional canonical board before distribution is enabled. New version carries strict decoding/byte/size safeguards and clear error recovery; never silently fall back to different clue geometry if a canonical artifact is invalid. Ship the supporting native build to the existing TestFlight group. Old installed versions remain legacy clients; do not claim parity for them.

## Verification
Tests cover provider failure/skips/incomplete profiles, identity invalidation, mandatory publish checks, stale draft updates, daily promotion, PNG integrity/bounds, stable scaling across profiles, cross-platform optional decoding, and unchanged legacy rendering. Inspect actual Studio/player/native canonical previews using the same fixture. Production daily remains unchanged. Artwork and enjoyment claims remain explicitly unmeasured.
