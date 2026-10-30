# Free Archive Sample

## Intent

Let a free player experience the Archive's unscored, hint-supported practice before deciding whether to buy Rebuzzle Plus. The sample should feel like real Rebuzzle play, while the paid value remains access to every other published past daily.

This spec adds one narrowly scoped free-sample exception to the Plus-only archive/practice behavior defined in `2026-10-27-plus-archive-practice-design.md`; all other Plus protections remain in force.

## Player experience

- The free Archive screen shows one stable sample puzzle selected from the oldest active, published past daily. It is the same sample for all players and stays stable as new daily puzzles are published.
- The sample uses the existing native practice board, progressive hints, answer-blind guesses, and Eve feedback. It is explicitly labeled `Sample · unscored`.
- Players may replay this same sample. The sample never changes the daily score, guesses, journal, Journey, streak, XP, achievements, or daily analytics.
- After a correct solve or explicit solution reveal, the sample result offers an optional path to Rebuzzle Plus, which unlocks the full archive. No purchase prompt interrupts an active sample round.
- Plus players continue to see the full archive and do not receive the free-sample gate.
- If no eligible past daily exists, the Archive explains that a sample is not available yet and still links to Plus.

## Server and entitlement boundaries

- `GET /api/puzzles/practice/sample` requires Rebuzzle authentication, is rate limited, returns no-store, and returns only the public puzzle projection. It does not require StoreKit Plus proof.
- The sample selection is made server-side from active puzzles published before the account's server-resolved local daily date, using a stable ascending publication-date/id order. The sample endpoint never accepts a client-selected puzzle ID.
- Practice guess, reveal, and practice-mode Eve requests may bypass StoreKit verification only when the request's puzzle ID equals the server-selected sample. Every other past puzzle continues to require a current Apple-verified Plus entitlement.
- The sample and full archive use the same published-past eligibility check, answer validation, rate limits, server-signed round token, answer-blind feedback, and explicit-reveal rules.
- The sample endpoint and wrong guesses never expose answer, explanation, hidden review data, or internal metadata. Correct guesses and a token-authorized explicit reveal retain the existing answer disclosure behavior.
- Practice token digests remain the only database writes made by sample guesses; the sample creates no daily or user-progress record.

## Monetization boundaries

- Do not change the current Plus product, price, purchase flow, or restore behavior.
- The free sample is one puzzle, not a one-use trial: replays remain limited to that same puzzle. The rest of the archive remains Plus-only.
- The result screen's Plus call to action is optional and appears only after the round has ended.
- Do not claim this change increases purchases or revenue without player and sales evidence.

## Accessibility and visual direction

- Reuse the existing Rebuzzle archive row, practice screen, typography, color tokens, and 44-point controls.
- Label the sample and unscored state clearly for VoiceOver; keep the clue spoiler-safe.
- Respect account changes, Dynamic Type, Reduce Motion, and existing keyboard dismissal behavior.

## Acceptance evidence

- A free authenticated player can load exactly one public archive sample and play its unscored practice round.
- The selected sample is active, published, and earlier than the server-resolved local puzzle date. No client-supplied ID can turn another archive puzzle into the sample.
- Sample responses contain no answer, explanation, or private editorial data.
- A free user remains denied for every non-sample archive puzzle in guess, reveal, and practice Eve APIs; valid Plus users retain existing access.
- Sample reveal still requires the server-issued active token proving three wrong guesses.
- UI confirms the free sample is playable, unscored, spoiler-safe, and offers Plus after completion; practice still leaves today's progress and rewards untouched.
- Existing daily gameplay, archive entitlements, Plus purchase/restore, and practice token regressions remain green.

## Product call

The sample is the oldest eligible published daily rather than a newly authored demo. This keeps the sample stable, uses content that already passed the daily publication process, and avoids maintaining a second puzzle catalog. The cost if this is wrong is that an old puzzle may represent the current art or difficulty less well; player feedback can justify replacing the selection rule later.
