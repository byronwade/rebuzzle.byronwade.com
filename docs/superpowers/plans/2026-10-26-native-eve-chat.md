# Native Eve Conversation Implementation Plan

Goal: Match the web game's guess → scored response → optional streamed Eve riff, in native SwiftUI.

Architecture: Existing scoring remains authoritative. A separate cancellable EveReplyStore calls the existing Bearer-authenticated plain-text /api/puzzles/quip endpoint; account/puzzle-scoped local presentation cache. Conversation displays all confirmed guesses and Eve responses, including after completion. Hints remain sequential pre-generated clues, as on web. No freeform chatbot or new backend.

- [x] Add tests for raw UTF8 stream/auth/error, reply isolation, optional failure and cancellation.
- [x] Add bounded4.5-second optional reply store and integrate only after scoring succeeds. Never retry scoring for AI failure.
- [x] Render native alternating user/Eve bubbles, useful exact/near word matches, live pending state and completed conversation.
- [x] Add fixture quip route and tests covering history across guesses and completion.
- [ ] Build/test; inspect light/dark and accessibility; signed beta uploaded only after verification and automatically distributed to existing tester.

Constraints: iOS18; no secrets/client AI credentials; answer never passed to quip API; stale account/day streams ignored; no reply failure blocks another guess; no invented AI replies or correctness; restored replies don't spend AI credits again.
