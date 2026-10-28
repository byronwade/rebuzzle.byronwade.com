# Plus Archive Practice

## Intent

Give Plus players a satisfying way to return to Rebuzzle between daily puzzles by letting them play published past dailies with the same answer-aware feedback and progressive hints as the daily game. The daily remains the one shared, scored puzzle; practice offers more room to reason without putting streaks, points, or achievements at risk.

This adds a concrete use for the existing one-time Plus purchase. It does not establish increased retention, enjoyment, conversion, or revenue without player evidence.

## Player experience

- Add a spoiler-safe **Archive** destination within the existing Plus Journal experience. Keep the existing saved Journal and its local Study Mode intact.
- Show only published daily puzzles from dates before the player's current daily date. Each row identifies its date and puzzle type without showing the answer or explanation.
- Opening an archive item starts an explicitly labeled **Practice · unscored** session. The board is the same published board used by the daily game.
- Players can make guesses and receive the existing cold, close, warm, and correct feedback. They can reveal the original progressive hints one at a time and ask Eve for answer-blind feedback.
- Practice is untimed. A three-guess round may end, but the player can start another unscored round for that archived puzzle without a penalty. The answer and explanation appear only after a correct guess or an explicit reveal after the round ends.
- A player can leave at any time and return to the archive. Practice state is ephemeral; a later visit starts a fresh round. The completed daily, saved Journal, and today's puzzle remain unchanged.
- Display a short reminder on the practice board that guesses, hints, and reveals do not change today's result, Journey, streak, or rewards.

## Gameplay and service boundaries

- Reuse the existing published puzzle source, answer normalization, deterministic guess feedback, and answer-blind Eve prompt where practical.
- Add a distinct authenticated practice request path. Do not remove the iOS daily-only request default or reuse the scored archive branch of the existing guess route.
- Practice requests must accept only a published puzzle dated before the server-authoritative daily date for that player, using the same timezone/date rule as daily gameplay. Never trust the device clock for this boundary. Reject today's puzzle, future dates, unpublished puzzles, and malformed identifiers.
- Practice requests must not call `createAtomicDailyAttempt`, `updateUserStats`, `checkAndAwardAchievements`, daily-progress writes, learning/final-attempt signals, or any other scoring or reward mutation. Do not persist guesses or session state.
- Return answer-blind feedback until a correct guess or explicit post-round reveal. The Eve prompt receives the puzzle type, the player's current guess, and feedback tier, but never the answer or explanation. Keep existing rate limits.
- Isolate Eve reply state by practice scope so a practice response cannot be mistaken for a daily response for the same puzzle.
- Keep Plus access behind the existing verified StoreKit entitlement. Do not add a new product, change the price, block today's puzzle, or insert a purchase prompt inside an active practice round.

### Server-side purchase and round verification

- The iOS app sends the JWS for a current, locally verified StoreKit Plus transaction with each archive or practice request. The server verifies the JWS with Apple's App Store Server Library and trusted Apple root certificates; it checks the expected app bundle, Plus product, environment, and revocation state before serving paid content.
- Plus remains scoped to the verified Apple Account purchase, matching StoreKit restore behavior. The same valid Apple transaction proof can unlock server Plus features under any authenticated Rebuzzle account on that Apple Account; the server does not bind the purchase to the first Rebuzzle account that claims it.
- Archive listing, practice guesses, solution reveal, and practice-mode Eve replies require both Rebuzzle authentication and a server-verified Plus transaction. Missing proof is denied; verifier configuration or Apple verification failures fail closed.
- A verified App Store Server Notifications V2 endpoint records transaction revocations/refunds so a previously issued transaction proof cannot preserve access after Apple revokes a purchase. The release checklist must identify the matching App Store Connect notification URL and server configuration.
- The client never supplies an authoritative attempt count. Each wrong practice guess receives a short-lived signed token bound to the authenticated user, puzzle, round, purpose, and cumulative wrong-guess count. The server stores only a digest of the current token, its user/puzzle/round binding, and its expiry, then atomically rotates that digest on the next guess. Replaying an older token or racing two requests cannot advance one round twice. Reveal accepts only the active token at count three; a correct guess invalidates the active token and reveals immediately. Guess text, answer, explanation, hint count, and practice progress remain unpersisted.
- Apply a bounded rate limit to archive listing as well as practice mutations, and describe the current limiter accurately as per-instance best-effort unless a shared store is configured.

## Persistence and privacy

- Use the authenticated player identity for access control and existing account isolation, but do not create persisted attempts, progress rows, analytics events, or journal entries for practice.
- Keep practice guesses and transient hint/round state in memory only. Leaving the screen, ending the process, or switching accounts discards the session. The server retains only a short-lived token digest for replay protection and automatically expires it.
- Follow existing no-store response headers and avoid logging raw guesses, answer material, or explanation text in the practice path.
- Archive list data is read-only and contains only presentation-safe metadata and puzzle identifiers; the answer remains server-side until the practice result permits disclosure.

## Visual and interaction direction

- Reuse Rebuzzle's established native card, ink, type, spacing, and motion tokens. Make the archive feel like a curated shelf of past daily challenges, not a generic table or a second tab bar.
- Keep puzzle date and type legible at a glance. Use answer-free status labels such as **New to you** and **Played** only when the app can establish that state without writing new history.
- Provide large, reachable hint, submit, reveal, and replay controls. Keep the existing keyboard-dismiss affordance and focus behavior.
- Respect VoiceOver, Dynamic Type, Reduce Motion, and the existing dark/light appearance behavior.

## Goals and non-goals

**Goals:** meaningful historical play, clear unscored status, trustworthy hint/AI feedback, preserved daily rewards, and a useful Plus benefit.

**Non-goals:** changing daily difficulty or editorial policy, adding competitive scores or leaderboards, selling extra attempts, adding notifications for archive play, syncing practice history, changing Journal notes, or measuring commercial success from implementation alone.

## Acceptance evidence

- Archive listing includes published past dailies and excludes today's/future/unpublished puzzles; list rows and accessibility labels never expose answers or explanations.
- Practice uses the same board, answer normalization, progressive hints, feedback tiers, and answer-blind Eve behavior as the daily game.
- The three-guess round ends cleanly; explicit post-round reveal displays the correct answer and explanation, and a fresh round resets only ephemeral practice state.
- Requests for today's, future, unpublished, unknown, or malformed puzzles fail without answer leakage or data mutation.
- Practice uses authenticated user isolation and no-store responses, does not persist guesses/session state, and never touches daily attempts, stats, XP, achievements, streak, daily progress, learning signals, or Journal storage.
- A practice Eve request still works after today's daily is complete, remains rate-limited, and does not share reply state with the daily session.
- Direct authenticated API calls without a valid Apple-signed Plus transaction are rejected; invalid signatures, wrong bundle/product/environment, revoked transactions, and mismatched request modes never return archive or solution data.
- A client cannot reveal by claiming `attemptNumber: 3`; it needs a server-signed round token produced only by the wrong-guess route and bound to its user and puzzle. Missing, altered, expired, cross-user, and cross-puzzle tokens are rejected.
- A verified refund/revocation notification blocks a previously issued transaction proof.
- Non-Plus players receive the existing Plus upsell before archive data is fetched; restored Plus access opens the Archive without changing purchase/restore behavior.
- UI tests verify the labeled unscored state, clue-first answer reveal, progressive hints, replay reset, keyboard dismissal, and accessibility at standard and accessibility text sizes.

## Limits

Archive practice draws on puzzles that have already been published and is not evidence that new puzzles are fair or take hours to solve. Solve-time, hint-use, abandonment, enjoyment, and conversion claims require blind playtests and production data; practice must not be presented as a measured retention or revenue improvement.

## Implementation calls for release hardening

- Use Apple's official Node App Store Server Library with the existing Node 24 runtime and public Apple Root CA certificates. Configure the app bundle ID and numeric App Store app ID as public deployment settings; no App Store private API key is required for signed-transaction and notification verification.
- Use the signed transaction JWS already available from StoreKit 2's `Transaction.jwsRepresentation`. The app continues to require its local StoreKit verification, while every paid server route independently verifies the proof.
- Use purpose-specific HS256 practice-round tokens signed with the existing `AUTH_SECRET`; set a 24-hour expiry and bind each token to the account and puzzle. This proves the server issued three wrong-guess steps without persisting practice sessions while allowing players to take their time between guesses.
- Keep the existing StoreKit product identifier and support both sandbox/TestFlight and production transaction environments. Configure App Store Server Notifications V2 after the production endpoint is available.
