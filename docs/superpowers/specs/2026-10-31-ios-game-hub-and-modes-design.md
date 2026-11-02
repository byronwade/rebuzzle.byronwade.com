# iOS game hub and play modes

Date: 2026-10-31
Status: approved in conversation, awaiting written-spec review

## Why

The Play tab opens straight into today's puzzle under a large "Make it click." headline. Once the daily is solved there is nothing else to do, and the screen reads as a single form rather than a game. Players asked for more fun and a much better home layout.

This work turns the Play tab into a game hub and adds two replayable modes built on past puzzles.

## Scope

Two pull requests, shipped in order:

1. **Hub layout (iOS only).** A new Play tab root. The existing daily screen is unchanged apart from being pushed instead of being the root.
2. **Rush and Endless (iOS + web).** Server routes for runs, two mode screens, and a summary for the hub cards.

Out of scope: AI player profiles, smarter puzzle generation, leaderboards, and any change to daily scoring, streaks or achievements. Mode play never counts toward streaks, achievements or the journal.

## 1. Hub layout (PR 1)

### Structure

`HomeView` becomes the root of the Play tab's `NavigationStack` in `RebuzzleApp.swift`. `TodayView` moves behind a new route, `RebuzzleRoute.daily`.

From top to bottom:

1. **Header row.** The date ("Friday, Oct 31") on the left. On the right, a streak chip (flame symbol plus the current streak count, reward tint; hidden when the streak is 0) and a small `EveAvatar`. No large masthead.
2. **Today's puzzle card.** A panel card (`Theme.panel`, corner radius 14) that contains:
   - an eyebrow with the puzzle type and the `DifficultyBadge`;
   - a compact, non-interactive preview of the board, using `PuzzleBoard` scaled to fit at about 120pt tall;
   - a status line, and a primary button using `CommitStyle`.

   | Daily state | Status line | Button |
   | --- | --- | --- |
   | Not started | "3 guesses · 3 nudges" | "Play today's" |
   | In progress | "N guesses left" | "Keep going" |
   | Solved | "Solved in N · new puzzle in Xh" | "See result" |
   | Out of guesses | "Answer revealed · new puzzle in Xh" | "See result" |
   | Loading or failed | the existing loading or error notice | hidden |

   Tapping the card or the button appends `RebuzzleRoute.daily` to `playPath`. The countdown text updates once a minute.
3. **"More ways to play" section.** An eyebrow, then a two-column grid of mode cards:
   - **Rush.** Bolt symbol, the line "3 minutes. Solve as many as you can."
   - **Endless.** Infinity symbol, the line "One miss ends the run."
   - **Archive.** Calendar symbol, the line "Replay any past puzzle." It opens the existing `ArchiveView`.

   In PR 1, Rush and Endless show a "Coming soon" footer and are disabled. PR 2 enables them. Each card is at least 120pt tall, its whole area is the tap target, and it has a combined accessibility label.

### Behavior

- The tab badge dot stays as it is now.
- `ReturnRouter` requests (notifications, deep links) that currently reset `playPath` and load the daily also push `.daily`, so a "today's puzzle is ready" notification still lands on the puzzle.
- When the daily is solved from the daily screen, popping back shows the hub's Solved state.
- The DEBUG `--preview-screen` switch gains `home` (the default Play root) and `daily` (pushes the daily screen).

### Files

- Create `apps/ios/Rebuzzle/Features/HomeView.swift` for the hub, `TodayPuzzleCard` and `ModeCard`.
- Modify `apps/ios/Rebuzzle/App/RebuzzleApp.swift` for the root swap, the `.daily` route, the return-router push and the preview screens.
- Modify `apps/ios/Rebuzzle/Features/TodayView.swift` only where needed: drop the masthead (the hub owns it) and add an inline navigation title "Today".

### Tests

- UI tests that expect the daily answer field at launch call a new helper, `openTodaysPuzzle(app)`, which taps `homeTodayCard` and waits for the field. The helper lives in the shared UI-test support file and is used across `GameplayUITests` and the other suites that touch the daily.
- New UI test: the hub shows `homeTodayCard`, tapping it shows the answer field, and going back returns to the hub.
- New UI test: a fixture with the daily already solved shows "Solved in" on the card.

## 2. Rush and Endless (PR 2)

### Rules

**Rush**
- The run lasts 3 minutes on the server clock, starting from run creation.
- Puzzles come from a queue of random published past puzzles.
- Each puzzle allows up to 3 guesses. "Skip" moves to the next puzzle without a penalty other than time.
- Score is the number of puzzles solved. When time runs out the current puzzle is abandoned.

**Endless**
- There is no clock.
- Each puzzle allows 3 guesses. Using all 3 without solving ends the run.
- Each run has 2 nudges in total. A nudge reveals the puzzle's next saved hint. When a puzzle has no hints the nudge button is disabled for that puzzle.
- Score is the number of puzzles solved in a row.

Both modes save a personal best per mode. A run that beats it plays the existing `CelebrationBurst` and shows "New best". Reduce Motion skips the burst, haptics respect the toggle, and the clock is announced to VoiceOver at 60, 30 and 10 seconds.

### Access

- Without Plus: 1 run per mode per local day, using the same local-date logic as the daily (`resolveStableJourneyTimeZone` and `getLocalPuzzleDate`).
- With Plus: unlimited runs.
- Starting a run when the allowance is used up returns 403 with `{ plusRequired: true }`, and the app opens `PlusView(source: .modes)`.
- Guests can play their free runs. Guest bests merge on upgrade in the same way as other guest data. If merging is not already generic, bests stay with the guest account and that is called out in the PR.

### Server

New Mongo collection `modeRuns`:

```ts
interface ModeRunRecord {
  _id: string;              // runId (random)
  userId: string;
  mode: "rush" | "endless";
  localDate: string;        // yyyy-MM-dd, for the free allowance
  puzzleIds: string[];      // queue, in order
  solvedPuzzleIds: string[];
  failedPuzzleIds: string[];
  startedAt: Date;
  endsAt: Date | null;      // rush only
  finishedAt: Date | null;
  score: number;            // finalized on finish
}
```

Indexes:
- `{ userId: 1, mode: 1, localDate: 1 }` for the allowance check.
- `{ userId: 1, mode: 1, score: -1 }` for bests.
- A TTL index is not used, because runs are the history that bests come from.

Routes:

- `POST /api/modes/runs` with body `{ mode }`.
  - Requires authentication (guests included) and is rate-limited like practice/sample.
  - Checks the allowance, then picks the queue. Rush picks 40 puzzles and Endless picks 60. Both are random published past puzzles before the local date, chosen with `$sample`.
  - Returns `{ runId, mode, endsAt, puzzles: PublicPuzzle[], freeRunsLeft }`. A `PublicPuzzle` contains no answer, matching what the archive returns.
- `POST /api/puzzles/practice/guess` accepts an optional `runId`. When it is present, the puzzle is authorized if the run belongs to the user, is not finished, and (for Rush) is before `endsAt`, and if the puzzle is in the run's queue and in neither the solved nor the failed list. A correct guess adds the puzzle to `solvedPuzzleIds`. A final wrong guess adds it to `failedPuzzleIds`, and in Endless it also finishes the run. The existing round-token flow is unchanged.
- `POST /api/modes/runs/:id/skip` with body `{ puzzleId }` is for Rush only and adds the puzzle to `failedPuzzleIds`.
- `POST /api/modes/runs/:id/finish` is idempotent. It sets `finishedAt` and `score = solvedPuzzleIds.length`, and returns `{ score, best, isNewBest }`. A Rush run past `endsAt` is treated as finished on any read, even if this route is never called.
- `GET /api/modes/summary` returns `{ rush: { best, freeRunsLeft }, endless: { best, freeRunsLeft } }`, where `freeRunsLeft` is `null` with Plus.

The score comes from server state only, so the client cannot inflate it. Solves submitted after `endsAt` are rejected with 409.

### iOS

- In `RebuzzleCore`:
  - `ModeRun` state: the queue index, solved count, guesses left on the current puzzle, nudges left, time left, and the finished state.
  - Pure functions for advancing the run and ending it.
  - `APIClient` additions: `startModeRun(_:)`, `skip(runID:puzzleID:)`, `finishModeRun(_:)`, `fetchModeSummary()`, and a `runID` parameter on the practice-guess call.
- In the app:
  - `ModeRunView` is shared by both modes. It has a top bar with the score and either the clock or the nudges left, the board, the answer field, Skip (Rush) or Nudge (Endless), and the guess feedback from the practice screen. It reuses `WrongGuessShake` and `GuessTurnView`.
  - `ModeResultView` shows the score, the best, the "New best" celebration, "Play again" (or the Plus offer when no runs are left), and "Back to hub".
  - The hub's Rush and Endless cards are enabled and show "Best N" and either "1 free run today", "Plus" or "Unlimited".
  - New routes `RebuzzleRoute.mode(ModeKind)` and `.modeResult`.
  - Leaving a run mid-way asks to confirm, then finishes the run.

### Errors

- A network failure while starting a run shows an inline notice on the hub card and does not use up the allowance, because the server creates the run only on success.
- A network failure on a guess shows the existing retry notice. In Rush the clock keeps running, because time belongs to the server.
- When the queue runs out (rare), the run finishes normally.

### Tests

- Jest:
  - Run creation, including the allowance with and without Plus and guest access.
  - The practice-guess `runId` authorization: a valid run, another user's run, a finished run, an expired Rush run, a puzzle not in the queue, and a puzzle already solved.
  - That a final miss in Endless ends the run.
  - That finish is idempotent and that best is computed correctly.
  - That summary reports free runs left.
- Core (Swift Testing): `ModeRun` advancing for both modes, nudge accounting and expiry.
- UI tests with a fixture API: a Rush run solves one puzzle, then skips one, then reaches the result. An Endless run ends on a miss. A used-up allowance opens Plus.

## Rollout

- PR 1 has no server dependency and can merge first.
- In PR 2, the server routes deploy before the app build that calls them. The hub hides the mode cards' stats if summary returns 404, so an older server degrades to "Coming soon".
