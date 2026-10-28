# Rebuzzle Plus Journal Sync Design

## Intent

Make the Plus journal a durable benefit that follows a player when they sign in on another device. Plus is currently a one-time purchase that unlocks a personal collection of daily puzzles and notes, but the collection is stored only on one device. Losing that device can erase the value of the purchase.

The daily puzzle remains free and playable offline. Sync improves the paid journal's reliability without adding a pay-to-win advantage, a new subscription, or pressure to open the app.

## Goals

- Restore a signed-in Plus member's completed daily entries and notes on another device.
- Keep local writes immediate and available when the network is unavailable.
- Never replace a conflicting note silently. Keep both versions until the player chooses to use the account copy, keep this device's copy, or combine them.
- Store only personal note text and its sync revision as new per-user server data. Rebuild puzzle content and completion facts from the existing published puzzles and authoritative daily-progress records.
- Gate server sync on the authenticated Rebuzzle account and a currently verified Plus StoreKit transaction.
- Delete synced notes with the account in the existing account-deletion transaction.
- Tell players whether their journal is on-device, syncing, synced, offline, or needs a conflict choice.

## Non-goals

- Change the Plus product, price, or purchase cadence.
- Change daily puzzle scoring, hints, streaks, sharing, or access to the free daily.
- Sync answer drafts, hint position, or an unfinished puzzle session.
- Merge data across different Rebuzzle accounts. A guest upgrade preserves its existing account ID; signing into a different account continues to show that account's journal.
- Add note contents to analytics, logs, AI prompts, or the existing Journey summary.
- Claim a retention, enjoyment, or revenue lift before a real player cohort is measured.

## Data and account behavior

The iOS app continues to save its complete `Journal` in account-scoped local storage. The server does not store duplicate clue boards, answers, explanations, or hint lists per user. An authenticated Plus journal read combines the user's terminal `dailyProgress` rows with their published puzzle records and their own notes. Puzzle content remains owned by the puzzle catalog; completion outcome and attempt count remain owned by daily progress.

New server records contain only `userId`, `puzzleId`, `note`, monotonically increasing `revision`, and server `updatedAt`, with a unique `{ userId, puzzleId }` index. A note write requires a strict payload containing `puzzleId`, `note`, and `expectedRevision`. The server derives `userId` from `getAuthenticatedUser`, requires a completed daily for that puzzle, checks `hasPlusEntitlement`, and applies a compare-and-set update. A stale revision returns the current note and revision without changing stored data.

Each device stores the last synced note and revision separately from the journal entry. When only the account copy changed, the device adopts it. When only the local copy changed, it uploads against the last known revision. If both changed, the app keeps the local note and stores the account copy as a conflict; the player chooses how to resolve it. Empty notes are versioned writes so deleting a note on one device also clears it on the others.

Existing local entries migrate on the first successful Plus sync. Guest play and guest Plus remain on-device until the guest upgrades or signs into a registered account. The guest-upgrade flow preserves the account ID, so its local notes can sync after conversion. A different account never receives another account's local or remote notes.

Journal history completeness is derived from the existing per-account `dailyProgressBackfills` checkpoint and the same final-attempt-versus-progress reconciliation check used by `/api/user/progress`. The API returns that existing `complete`, `in_progress`, `failed`, or `not_started` state; the iOS client treats only `complete` as fully arrived. If the backfill is incomplete, the app keeps local entries that have no authoritative server completion row and retries on a later sync; a partial response must not be presented as a fully synced history.

## API and failure handling

- `GET /api/user/journal` returns this account's completed journal entries, current notes/revisions, and whether daily-progress history is complete. It requires authentication, a non-guest account, a verified Plus transaction, bounded request rate, and `Cache-Control: private, no-store`.
- `PUT /api/user/journal/note` writes one note using optimistic concurrency. The route rejects unknown keys, invalid IDs/revisions, notes above 10,000 Unicode characters or 40 KB UTF-8, requests for a puzzle the account has not completed, and requests without current Plus proof.
- Per-entry writes are idempotent with respect to the expected revision. Concurrent first writes and stale updates return the canonical remote note rather than overwriting it.
- A failed read/write never blocks gameplay or discards the on-device note. The app keeps the draft locally, exposes a truthful pending/offline/error state, retries on the next foreground, successful account restore, or note edit, and offers a manual Retry sync action while offline.
- No note text is written to logs, telemetry, or analytics. Account deletion removes the new collection in the same transaction as other user-owned records.

If Plus entitlement is revoked, journal API access stops immediately because every read and write requires a currently verified StoreKit transaction. Existing cloud notes remain associated with the Rebuzzle account and are not silently deleted; access returns if Plus is restored. They are removed through the existing account-deletion flow. The on-device copy remains in local storage subject to the app's existing Plus access rules.

## iOS experience

The Journal remains in its current native tab/stack flow. Use quiet chrome, one restrained accent for the current state, readable 44-point actions, and a compact status near the journal heading. The screen should distinguish:

- **On this device:** guest or non-Plus local state; offer sign-in only as an optional way to make the journal portable.
- **Syncing / waiting for connection:** local copy remains usable, with no success claim until the server confirms.
- **Synced:** account copy is confirmed.
- **History still arriving:** authoritative progress backfill is incomplete.
- **Note conflict:** show both versions and three explicit resolution actions. Editing the device copy does not clear the conflict or overwrite the account copy; an explicit choice is still required. If combining both notes exceeds the note limit, keep both versions visible and let the player edit the device copy before choosing it.

The sync copy should state that signed-in Plus notes are stored with the Rebuzzle account and removed by account deletion. Guests can keep using their journal on-device and export it.

## Privacy and release constraints

This change moves free-text journal notes from device-only storage to an account-linked server collection for registered Plus members. Update the policy source and `apps/ios/Release/Privacy.md` to describe the purpose, account linkage, sync behavior, and account-deletion path. The existing App Store `Gameplay Content` category already covers user-authored content; reconcile its purpose/linkage against this new flow before publishing the final privacy answers. Do not claim that unpublished App Store Connect answers or policy text are live.

Keep the StoreKit entitlement Apple-account scoped, as it is today, and keep journal records strictly Rebuzzle-account scoped. Do not add entitlement-to-Rebuzzle-account binding in this work.

## Evidence required

Tests must cover authenticated and Plus-only access, completion ownership, strict input validation, concurrent note conflicts, note deletion, account deletion, local-first/offline behavior, first-sync migration, account switching, guest upgrade, entitlement revocation, and all three conflict resolutions. Tests prove these contracts, not product outcomes. Production retention and commercial impact remain unmeasured until a privacy-reviewed build is distributed and a cohort is observed.
