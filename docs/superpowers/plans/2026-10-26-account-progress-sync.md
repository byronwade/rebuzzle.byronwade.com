# Account-backed daily progress implementation plan

**Goal:** Restore Rebuzzle Journey progress across devices for accounts, without syncing the private puzzle journal or changing the daily game contract.

**Architecture:** Keep MongoDB authoritative. Create an idempotent daily progress projection from persisted final daily attempts, expose an authenticated summary endpoint, and upgrade guests in place when they create an account. iOS keeps a per-identity last-synced offline snapshot, while the local journal remains device-only and identity-namespaced. Do not reuse or mutate `userStats.points`.

**Relevant verified conventions:** `apps/web/src/db/indexes.ts` owns Mongo indexes, and production requires the explicit index-creation operation. Final daily attempts already have a partial unique index by user and local puzzle date. iOS Journey calculations are in `apps/ios/Core/Sources/RebuzzleCore/JourneyProgress.swift`; the screen and app model are in `apps/ios/Rebuzzle/Features/ProgressScreen.swift` and `apps/ios/Rebuzzle/App/AppModel.swift`. See the design spec for date, privacy, and recovery invariants.

## Global constraints

- Do not change the once-daily puzzle rule, three-guess contract, answer validation, StoreKit entitlement, or existing account-stat semantics.
- Derive user identity, local puzzle date, outcome, and attempt count from verified server state. A client cannot choose another user's records or mint XP.
- Keep answer, explanation, raw guesses, journal notes, and artwork out of the new progression ledger. Journal storage remains on-device and namespaced by its owning identity.
- Never reward an archive puzzle as an official daily completion. Use the stable identity `journeyTimeZone` for official daily puzzle retrieval, puzzle selection, date locks, and week bounds on every device; finalization uses the saved attempt's date and zone. Settings explains the account's daily-reset zone.
- A server record is idempotent by user and puzzle date. A duplicate-key race must resolve by reading the winning record, not by awarding twice or failing an already-accepted puzzle.
- Account upgrade must preserve the guest's exact user ID; signing in to another account does not silently merge guest progress. Only rotate Keychain credentials after a successful response.
- Daily play, hints, sharing, XP, weekly goals, and badges stay free. Do not add paid streak repair, XP multipliers, or guilt/punishment mechanics.
- Preserve the existing feature branch and PR. Do not alter the unrelated worktree changes in `docs/product/native-growth-scorecard.md` or the two untracked Xcode project directories.
- Do not claim Apple/TestFlight availability while Apple's review is pending. Attach a new build to the existing groups and keep the current invite link when Apple processing permits.

## Task 1: Lock Journey scoring and response shape with core tests

1. Add failing core tests for decoding complete and incomplete snapshots, only the `solved`/`failed` outcomes (reject `revealed`), stable badge IDs, server-provided Monday–Sunday week bounds, nullable legacy `hintCount` and historical `timeZone` metadata, and malformed payload rejection. Account-specific cache isolation is tested in Task 6 at the app persistence boundary.
2. Introduce Codable entry and snapshot DTOs matching the exact JSON contract in the design spec. The API computes XP, level, counts, weekly progress, and badges; iOS renders those values without recomputing or inventing account rewards.
3. Keep the Core model limited to server-provided summary fields and entries; it must not derive account XP, levels, weekly totals, or rewards from local journal data.
4. Run the focused Swift package test suite and verify all old Journey rules still pass.

## Task 2: Add idempotent Mongo progress projection and explicit index

1. Add stable `journeyTimeZone` to the account identity (including guests), without repurposing mutable `UserStats.streakTimeZone`; add `puzzleTimeZone` to new persisted puzzle attempts and allow it to be null/absent on historical rows. Add the `dailyProgress` collection type and `dailyProgressOps` near the existing Mongo operations, plus per-user backfill state in the account model or a narrowly scoped metadata record. The terminal timestamp is the final persisted attempt's `attemptedAt` for wins and losses; its optional `completedAt` is not present on losses and is not the canonical clock.
2. Add the unique `{ userId: 1, puzzleDate: 1 }` index to `INDEX_DEFINITIONS`; preserve central index creation and duplicate/race handling conventions.
3. Implement insert-only progress materialization from an accepted final daily attempt. Map `isCorrect` to `solved` or `failed`; exhausting guesses reveals the answer in the client but is still a `failed` outcome, and no separate voluntary reveal endpoint exists. A solve takes 1–3 guesses; a failed terminal session follows all three guesses. Exclude archives and non-final attempts. Use the accepted local `puzzleDate`, not UTC, and validate counts, outcome, and time-zone fields from the persisted attempt. Preserve clamped `hintsUsed` as a best-effort client-reported signal; do not call it server-verified.
4. Add unit/integration tests for unique same-day insertion, duplicate retries, competing insertions, and exclusion of archive/non-final attempts.
5. Run the focused web test file(s), lint/type checks for changed modules, and `pnpm db:create-indexes` in a non-production/test database to verify index creation.

## Task 3: Make finalization and restore heal the projection

1. Resolve the stable identity time zone before selecting an official daily puzzle, and use it for the puzzle date and date lock in every retrieval path. Persist that effective zone as `puzzleTimeZone` on new attempts. Write the progress projection in the same server finalization path that persists an official daily final attempt; use the persisted attempt's puzzle date and time zone, not the request header. If projection writing fails after the attempt is persisted, preserve the accepted puzzle result, log the failure, and heal from the persisted attempt later.
2. Ensure session restore and progress fetch can re-create a missing projection using the persisted attempt, never request-supplied success/date/XP. A guess retry after a terminal attempt currently returns conflict, so do not rely on that retry as the sole repair path.
3. Backfill older records server-side from existing final daily attempts; mark unavailable hint data unknown so it cannot earn an unverified no-hint bonus.
4. Add route tests for exactly-once awards across response loss, terminal retry, restore, concurrent devices, and backfill. Catch duplicate-key races by reading the inserted winner and treating the operation as successful.
5. Add a resumable backfill command that keyset-pages existing final daily attempts, excludes archives, writes minimal projections in bounded batches, logs processed/inserted/skipped/error counts, and persists a per-user completion marker only after that user's full successful scan. Test reruns and interrupted/resumed runs. Historical attempt `timeZone` is null when no value was recorded; do not infer it from `UserStats.streakTimeZone` or rewrite its `puzzleDate`. Users with incomplete history receive no partial summary; new accounts with no prior final attempts are immediately complete.
6. Confirm `/api/user/stats` behavior is unchanged and archive play cannot write Journey progress.

## Task 4: Expose authenticated progress summary

1. Add `GET /api/user/progress`, derive identity from the bearer JWT, and return summary plus only the latest 42 completed dates needed by iOS. Include server-computed `asOfPuzzleDate`, Monday `currentWeekStart`, Sunday `currentWeekEnd`, and per-user backfill status based on stable `journeyTimeZone`; allow `summary: null` until backfill completes.
2. Reject/ignore client user IDs; test another account cannot inspect or influence the response.
3. Test empty users, guests, members, different device time zones for one account (same official puzzle date and puzzle), Monday/Sunday edges in the saved zone, incomplete backfill, malformed stored rows, and `completedAt` mapping from the terminal persisted `attemptedAt` for both wins and losses.
4. Return every completed entry in the current week plus up to the 35 most recent completed entries before `currentWeekStart`; historical `timeZone` may be null. Test both the week inclusion and prior-entry boundary.
5. Update API/client types and documentation to state that only Journey summaries sync; answers, guesses, explanations, and journal notes stay local.

## Task 5: Add safe native guest upgrade

1. Add failing API tests for invalid tokens, non-guest identities, duplicate email, invalid signup values, successful in-place conversion, and response-loss retries.
2. Implement `POST /api/auth/guest/upgrade` using the existing signup validators, password hashing, and token issuer; require the caller's verified guest JWT, keep its user ID and `journeyTimeZone`, and verify same-account credentials on a lost-response retry.
3. Make response-loss retries safe: if the same guest token resolves to an already-upgraded user, verify the submitted credentials against that exact user ID before issuing a fresh member token.
4. Add native registration UI reachable from Settings and wire it to the endpoint. Replace the Keychain identity only after successful conversion.
5. Before switching a guest to an existing account, show clear copy that progress is not merged and offer account creation to preserve the current guest journey.
6. Test that guest progress remains queryable after upgrade and that no arbitrary guest ID can be converted or another account's credentials used for an idempotent retry.

## Task 6: Sync Journey in the iOS app

1. Add APIClient methods and DTOs for progress fetch/reconciliation and guest upgrade.
2. Load a progress snapshot for the active identity, refresh after daily completion and session restore, and key offline cache by user ID. Treat the API's server week bounds as authoritative across devices; explain in Settings that the daily reset uses the account's saved time zone.
3. For members, use only a server response or that identity's last-synced cache. With neither, render a syncing/unavailable state instead of inferring account totals from journal entries. Keep guest snapshots isolated by guest ID. Make server progress the source of truth; show the last-synced snapshot when offline, or syncing/unavailable if none exists. A failed progress fetch cannot block play or journal editing.
4. Update ProgressScreen to use the server Journey summary and remove inaccurate “device-saved” wording for account-backed progress. Keep private journal records local and identity-namespaced.
5. Add UI tests for a completion-to-Journey update, switching accounts, guest upgrade, offline cached state, Dynamic Type, VoiceOver labels, and reduced motion.

## Task 7: Privacy and release readiness

1. Review the privacy policy, App Store privacy declarations, and account deletion path against the new minimal progress collection and guest upgrade; update only source-backed claims.
2. Ensure account deletion removes the user's dailyProgress records and guest upgrade does not broaden data use.
3. Run relevant web and iOS tests, Biome/TypeScript checks, iOS simulator build/UI tests, and an archive build. Preserve unrelated worktree changes.
4. Verify the new unique index exists in the intended environment before a backend release; deploy only through the existing project workflow.
5. Build/upload a new TestFlight build and attach it to the existing Family and automatic-update groups when Apple processing allows; retain the existing invite link and report Apple review status accurately.
