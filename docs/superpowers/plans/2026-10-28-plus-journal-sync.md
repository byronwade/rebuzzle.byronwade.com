# Plus Journal Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the Plus journal portable across a player's Rebuzzle account while preserving local-first offline use and explicit conflict resolution.

**Architecture:** The server stores only per-account note text and revisions; journal entries are reconstructed from the existing daily-progress and puzzle collections. The iOS app keeps its full journal and sync checkpoint in account-scoped local storage, reconciles remote changes without overwriting concurrent edits, and exposes sync/conflict state in the existing Journal flow.

**Tech Stack:** Next.js route handlers, MongoDB operations/indexes, StoreKit signed transaction verification, SwiftUI, RebuzzleCore Codable models, Jest, Swift Testing/XCTest.

**Spec:** `docs/superpowers/specs/2026-10-28-plus-journal-sync-design.md`

## Global Constraints

- Daily puzzle play remains free and usable offline.
- Journal reads and writes require a registered Rebuzzle account and current verified Plus StoreKit transaction.
- New server records contain only `userId`, `puzzleId`, `note`, `revision`, and `updatedAt`.
- Local journal writes remain immediate; a network failure never removes the local note.
- Note text is limited to 10,000 Unicode characters and 40 KB UTF-8.
- Only `complete` from the existing daily-progress backfill status is presented as complete history.
- A stale note update never overwrites the server copy; both versions remain available for resolution.
- No note contents enter analytics, logs, or AI prompts.
- Preserve all pre-existing working-tree changes; do not stage, commit, push, publish, or upload builds.

## Review Focus

- Per-account backfill state is `failed`, `not_started`, or reconciliation is pending; test that the journal never presents this history as complete.
- A note has 10,000 Unicode scalars but exceeds 40 KB UTF-8, or contains unknown request fields; test strict rejection.
- Two clients perform their first write or update from the same revision concurrently; test the unique index and compare-and-set preserve one canonical note and return the conflict.
- The account changes while a sync request is in flight; test that an old response cannot mutate the newly selected account's journal or checkpoint.
- The network fails after a local edit or during conflict resolution; test that local text and unresolved remote text remain recoverable.

---

### Task 1: Account-owned note storage and backfill status reuse

**Files:**
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/db/operations.ts`
- Modify: `apps/web/src/db/indexes.ts`
- Modify: `apps/web/src/app/api/user/account/route.ts`
- Create: `apps/web/src/lib/daily-progress-backfill-status.ts`
- Create: `apps/web/src/lib/__tests__/daily-progress-backfill-status.test.ts`
- Modify: `apps/web/src/app/api/user/progress/route.ts`
- Modify: `apps/web/src/db/__tests__/daily-progress.test.ts`
- Modify: `apps/web/src/app/api/user/account/__tests__/route.test.ts`
- Test: `apps/web/src/db/__tests__/journal-note-ops.test.ts`

**Interfaces:**
- Produces `JournalNote { userId: string; puzzleId: string; note: string; revision: number; updatedAt: Date }`.
- Produces `journalNoteOps.listForUserPage(userId, puzzleIds)` and `journalNoteOps.compareAndSet({ userId, puzzleId, note, expectedRevision, updatedAt })`; compare-and-set returns the new note when applied or `null` when stale, after which the route reads the canonical note.
- Produces `getDailyProgressBackfillStatus(state, finalAttemptCount, progressCount)` with the existing `complete | in_progress | failed | not_started` outcomes.
- Account deletion removes `journalNotes` inside its existing transaction.

- [x] Write DB-operation tests for first write, revision increment, stale compare-and-set, and competing first writes; write status tests for each existing backfill branch; assert the unique index and account-deletion collection.
- [x] Run `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/journal-note-ops.test.ts src/db/__tests__/daily-progress.test.ts src/app/api/user/account/__tests__/route.test.ts src/lib/__tests__/daily-progress-backfill-status.test.ts` and confirm the new expectations fail because the feature is missing.
- [x] Implement the model, unique `{ userId: 1, puzzleId: 1 }` index, CAS operations, and exported backfill helper; update the existing progress route to use the helper without changing its response.
- [x] Add `journalNotes` deletion to the account-deletion transaction.
- [x] Run `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/journal-note-ops.test.ts src/db/__tests__/daily-progress.test.ts src/app/api/user/account/__tests__/route.test.ts src/lib/__tests__/daily-progress-backfill-status.test.ts` and confirm the expected behaviors pass.

### Task 2: Authenticated, paginated journal read API

**Files:**
- Create: `apps/web/src/app/api/user/journal/route.ts`
- Modify: `apps/web/src/db/operations.ts`
- Create: `apps/web/src/db/__tests__/journal-page-ops.test.ts`
- Test: `apps/web/src/app/api/user/journal/__tests__/route.test.ts`

**Interfaces:**
- `GET /api/user/journal?limit=100&before=<puzzleDate>` returns `{ success, entries, nextCursor, historyStatus }`.
- Each entry contains puzzle detail from `puzzles`, completion facts from `dailyProgress`, and note/revision from `journalNotes`; missing note records read as note `""` and revision `0`.
- `dailyProgressOps.listForUserPage(userId, { limit, beforePuzzleDate? })` returns newest rows first; `countValidForUser(userId)` counts rows matching the progress API's completion invariants; `puzzleOps.findByIds(ids)` returns catalog rows regardless of current active status.
- Pagination defaults to 100 entries, caps at 100, uses a validated `before` `YYYY-MM-DD` date and descending `puzzleDate`; `nextCursor` is the last returned date when another page exists, otherwise `null`.
- Registered account and valid Plus proof are checked before journal data is queried; response is `private, no-store` and uses bounded rate limiting.

- [x] Write DB tests for page ordering/filter/limit, valid-completion counting, and empty-ID puzzle lookup; write route tests for registered Plus access, guests, absent/invalid Plus proof, own-account isolation, puzzle join, pagination, and all backfill-status responses.
- [x] Run `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/journal-page-ops.test.ts src/app/api/user/journal/__tests__/route.test.ts` and confirm the new expectations fail because the feature is missing.
- [x] Implement bounded progress-page and puzzle-ID batch lookup operations, then the authenticated route using `getDailyProgressBackfillStatus`.
- [x] Run `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/journal-page-ops.test.ts src/app/api/user/journal/__tests__/route.test.ts` and confirm the expected responses and access guards pass.

### Task 3: Strict optimistic note-write API

**Files:**
- Create: `apps/web/src/app/api/user/journal/note/route.ts`
- Modify: `apps/web/src/db/operations.ts`
- Modify: `apps/web/src/db/__tests__/journal-page-ops.test.ts`
- Test: `apps/web/src/app/api/user/journal/note/__tests__/route.test.ts`

**Interfaces:**
- `PUT /api/user/journal/note` accepts exactly `{ puzzleId: string, note: string, expectedRevision: integer }`.
- `dailyProgressOps.findForUserPuzzle(userId, puzzleId)` proves the authenticated account has a terminal completion before a note write.
- The authenticated user must own a terminal `dailyProgress` row for `puzzleId`; user ID is never accepted from the body.
- Success returns `{ success: true, note, revision, updatedAt }`; stale CAS returns HTTP 409 with the canonical current note/revision and does not write.
- Empty `note` is a revisioned tombstone so note deletion syncs to other devices.
- The request body is capped at 64 KB; note text is capped at 10,000 extended grapheme clusters and 40,000 UTF-8 bytes; puzzle IDs are 1–128 ASCII letters, digits, `:`, `_`, or `-`.

- [x] Add tests for completion lookup ownership, unknown keys, malformed IDs/revisions, Unicode and UTF-8 boundaries, request-size rejection, current Plus proof including revoked transactions, tombstones, and stale revision responses; add an operation test for account-scoped completion lookup.
- [x] Run `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/journal-page-ops.test.ts src/app/api/user/journal/note/__tests__/route.test.ts` and confirm they fail before route implementation.
- [x] Implement strict validation and a rate-limited CAS route; do not include note text in logs or analytics.
- [x] Run `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/journal-page-ops.test.ts src/app/api/user/journal/note/__tests__/route.test.ts` and confirm all validation and CAS cases pass.

### Task 4: Local sync checkpoint and deterministic reconciliation

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/JournalSync.swift`
- Modify: `apps/ios/Core/Sources/RebuzzleCore/Journal.swift`
- Modify: `apps/ios/Rebuzzle/Features/ProgressScreen.swift`
- Create: `apps/ios/Core/Tests/RebuzzleCoreTests/JournalSyncTests.swift`

**Interfaces:**
- `JournalSyncCheckpoint.entries` maps puzzle ID to `JournalSyncCheckpointEntry(revision:lastSyncedNote:remoteConflict:)`.
- `JournalSyncRemoteEntry(entry:noteRevision:)` carries the complete remote `JournalEntry` and note revision.
- `JournalSyncReconciler.reconcile(local:checkpoint:remote:) -> JournalSyncReconciliation` returns merged `journal`, updated `checkpoint`, `pendingWrites`, and `conflicts` without I/O.
- `JournalSyncReconciler.resolve(puzzleID:choice:journal:checkpoint:) -> JournalSyncNoteWrite?` supports `.account`, `.device`, and `.combine`; device/combined resolutions produce a CAS write against the conflict's current remote revision.
- `JournalSyncReconciler.markSaved(_:revision:checkpoint:)` advances the sync baseline after a successful server write.
- `JournalEntry.hintsUsed` becomes optional so legacy rows with unknown hint counts stay unknown; export renders unknown explicitly.

- [x] Write reducer tests for first-sync adoption/migration, remote-only edits, local-only edits, simultaneous edits, equal-note convergence, account-copy/device-copy/combined resolutions, and unknown historical hint counts.
- [x] Run `swift test --package-path apps/ios/Core --filter JournalSyncTests` and confirm new reconciliation cases fail before implementation.
- [x] Implement checkpoint and pure reconciliation/resolution types; retain both local and remote note strings on conflict.
- [x] Run `swift test --package-path apps/ios/Core --filter JournalSyncTests` and confirm reconciliation is deterministic and Codable.

### Task 5: iOS API, account-safe orchestration, and journal UI

**Files:**
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/Rebuzzle/Features/JournalView.swift`
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift`
- Modify: relevant tests under `apps/ios/RebuzzleTests/` and `apps/ios/RebuzzleUITests/`

**Interfaces:**
- APIClient fetches all pages and writes note CAS requests, attaching the existing StoreKit transaction JWS to `/api/user/journal` requests.
- AppModel persists checkpoint under `journal-sync:<player.id>` and captures the identity generation for every asynchronous sync; stale responses are ignored.
- `saveJournal()` first persists locally, then schedules a debounced sync only when signed in and Plus is active.
- Sync retries after successful sign-in/guest upgrade/Plus restore and when the app becomes active; eligibility loss does not delete data.
- Journal status states are `on-device`, `syncing`, `synced`, `offline`, `history-arriving`, and `conflict`; conflict UI offers account version, this device, and combine.

- [x] Add API client/model tests for StoreKit header inclusion on journal routes, page decoding, HTTP 409 refresh behavior, and network failure preservation.
- [x] Add state/reconciliation integration tests for account switch during flight, local-first save, retry, guest upgrade, and all conflict choices.
- [x] Run the focused `xcodebuild test` suite for the `Rebuzzle` scheme and confirm the new sync cases fail before orchestration and UI changes.
- [x] Implement API wiring, account-scoped storage, lifecycle triggers, debounced local-first sync, and truthful Journal status/conflict controls.
- [x] Update Journal/Plus copy to explain device-only guest notes, signed-in Plus sync, offline access, and conflict choices; preserve native navigation and 44-point actions.
- [x] Run the focused `xcodebuild test` suite for the `Rebuzzle` scheme and confirm local save, identity isolation, retry, and conflict resolution pass.

### Task 6: Privacy disclosures and whole-change verification

**Files:**
- Modify: `apps/web/src/app/privacy/page.tsx`
- Modify: `apps/ios/Release/Privacy.md`
- Modify: `docs/product/plus-journal-release.md`

- [x] Update disclosures to identify journal note text, account linkage, Plus-only syncing, account-deletion behavior, and local/offline storage accurately.
- [x] Verify privacy copy does not claim App Store Connect answers have been changed.
- [x] Run focused backend and native checks for all tasks, then run the relevant repository typecheck/build commands and report pre-existing failures separately.
- [x] Review the complete diff for scope, note-content logging, account isolation, deleted-account behavior, and misleading sync claims.
