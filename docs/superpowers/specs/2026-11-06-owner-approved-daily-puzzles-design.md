# Owner-Approved Daily Puzzles

## Intent

Rebuzzle is a Wordle-style game: one puzzle a day, three guesses. Players have to be able to trust that every daily puzzle is fair, readable and correctly judged, and that a puzzle is there every day. The current pipeline has strict checks before a puzzle is generated, but several paths let an unreviewed, broken or missing puzzle reach players:

- When no human-admitted candidate exists, the server falls back to a fixed reserve list or a community lottery. Neither has blind playtests.
- When the reserve runs out, `/api/puzzle/today` returns a 500.
- A correct guess can be marked wrong.
- A bad live puzzle stays up all day.
- Admin edits skip every check.

This spec makes the owner the final gate: **no puzzle reaches players unless the owner approved that exact content.** It adds the supply, alerts, serving rules and answer judging needed to keep that promise every day.

Bonus rounds and more puzzles per day are explicitly out of scope. The game stays one daily puzzle.

## Goals

- Every served daily puzzle carries an owner approval that matches its current answer, board and accepted answers.
- At least 14 days of approved puzzles are scheduled ahead, plus at least 7 approved backup puzzles.
- The owner is alerted by email well before supply runs short, and right away when something goes wrong on a live day.
- Players never see a server error in place of the daily puzzle.
- A correct answer, including a small typo or an approved alternate phrasing, is accepted. An infrastructure failure never costs a player a guess.
- The owner can pull a live puzzle and replace it in one action without corrupting results or streaks.

## Puzzle lifecycle

Each daily-eligible puzzle has a single `review.state`:

`candidate` → `awaiting_approval` → `approved` → `live` → `retired`

The side exits are `rejected` (from `awaiting_approval`) and `pulled` (from `live`).

- **candidate**: generated or imported. It must still pass every existing automated gate in `run-generation.ts`, `daily-challenge.ts` and `publication-assets.ts`. A failing candidate never reaches the owner.
- **awaiting_approval**: passed automated gates and blind playtests (`publish-reviewed-daily-puzzle.ts` admission rules are unchanged). It is shown in the review queue.
- **approved**: the owner approved it. It has either `role: "scheduled"` with a `dateKey`, or `role: "backup"`.
- **live**: served for its date key. **retired**: its day has passed. **pulled**: removed from a live day by the owner.

### Approval record

The approval record is `{ approvedBy, approvedAt, contentHash }`.

- `contentHash` is a SHA-256 over the canonical JSON of the answer, the normalized `acceptedAnswers` list and the rendered board definition (`visual`).
- Any change to these fields produces a different hash, so the approval stops matching and the puzzle returns to `awaiting_approval`.

### One choke point

`persist-daily-puzzle.ts` and the `/api/puzzle/today` publish path refuse any puzzle whose approval record is missing or whose `contentHash` does not match. The check runs at serve time, not only at approval time.

## Owner review screen

Extend the existing admin page `app/(admin)/admin/puzzle-playtests` into the review queue, reachable from the admin dashboard. For each `awaiting_approval` puzzle it shows:

- The board rendered exactly as players see it, at iPhone width, in light and dark mode. Use the production render path, not a separate preview renderer.
- The answer, and an editable **accepted answers** list.
- Playtest evidence:
  - solve rate and median solve time;
  - every distinct wrong guess with its count, so near-misses can be promoted to accepted answers with one tap;
  - ambiguity and visual-failure reports.
- The source: `generated`, `reserve` or `community`. Community puzzles that were publicly playable are flagged "previously public".

Actions:

- **Approve for next open date.** This takes the earliest unscheduled date key from tomorrow onward.
- **Approve as backup.**
- **Reject**, with an optional reason. The reason is stored for generation learning.
- **Edit accepted answers.** This doesn't void an approval the owner is making in the same action.

A **schedule view** lists the next 30 date keys with their puzzle, or "empty" in red. It also shows the backup pool count and queue depth.

- The owner can reorder scheduled puzzles or unschedule one back into the backup pool.
- Today's date can't be changed here; that is what **Pull** is for.

## Supply

- The `generate-puzzles` cron runs every 6 hours instead of once a day.
- Each run generates candidates until the `candidate` plus `awaiting_approval` count reaches 20, or the run's AI budget or time limit is hit. A failed attempt is logged and retried on the next run instead of skipping the day.
- The existing quality-drift and human-calibration breakers still apply. When they trip, an alert is sent, because they now directly drain supply.
- The current static reserve corpora (`DEMANDING_RESERVE_PUZZLES` and the legacy `RESERVE_PUZZLES`) and eligible community puzzles are imported once as `candidate` with their source label. This gives the owner an immediate backlog. They go through the same playtest and approval path and are never served directly.

## Serving

For a requested local date key, `/api/puzzle/today`:

1. Serves the approved puzzle scheduled for that date key, if its approval matches.
2. Otherwise takes the oldest approved backup, assigns it to that date key, serves it and sends an urgent alert.
3. Otherwise returns `503` with `{ code: "daily_puzzle_unavailable", retryAfterSeconds: 300 }` and sends an urgent alert. It never returns 500 for a missing puzzle.

The UGC lottery and `selectMongoReservePuzzle` are removed from the serving path.

## Alerts

Alerts are sent by email through the existing Resend service (`lib/notifications/email-service.ts`) to `ADMIN_ALERT_EMAIL`. They are de-duplicated per alert type per date key.

| Trigger | Level |
| --- | --- |
| Daily digest: scheduled days, backups, queue depth | info |
| Fewer than 7 scheduled days ahead | warning |
| Fewer than 3 scheduled days ahead, or fewer than 3 backups | urgent |
| A backup was used for a date key | urgent |
| `daily_puzzle_unavailable` was returned | urgent |
| Generation breaker tripped, or 3 consecutive generation runs produced no candidate | warning |
| Live puzzle reports reached the threshold (below) | urgent |
| AI answer judge unavailable for 5+ guesses in 10 minutes | warning |

## Fair answer judging

The puzzle stores `acceptedAnswers: string[]`. The canonical answer is always included.

`validateAnswer` checks each accepted answer in this order:

1. **Normalized match.**
   - Normalization: case, punctuation, whitespace, a leading "a/an/the", and "&" ↔ "and".
   - The existing word-order rule is kept.
2. **Deterministic typo tolerance**, per word, using Damerau-Levenshtein distance.
   - Words of 4 or fewer letters must be exact.
   - Words of 5–8 letters allow 1 edit.
   - Words of 9 or more letters allow 2 edits.
   - Each word must stay closer to its target than to any other accepted answer's word.
   - This replaces the 0.95 whole-string similarity rule, and the unused `maxTypoRatio` is removed.
3. **AI judge**, as today, now given the puzzle explanation and the accepted answers as context. AI acceptances are logged and shown on the review screen so they can be promoted or blocked.
4. **AI judge timeout or unavailability:**
   - The guess route returns `{ code: "validation_unavailable" }`.
   - The attempt is **not** recorded and the attempt number does not advance.
   - The player is asked to try that guess again.

## Pulling a live puzzle

### Reports

Players already submit ratings and difficulty feedback. Add a "this puzzle seems broken" report reason, limited to one report per player per puzzle.

The alert threshold is 3 distinct player reports for that puzzle and date key.

### The Pull action

On the schedule view or from the alert link, **Pull today** for a date key:

1. Marks the puzzle `pulled` with a reason.
2. Assigns the oldest approved backup to the date key. If no backup exists, the date key returns `daily_puzzle_unavailable`.
3. Revalidates the `daily-puzzle` cache.

Effect on players:

- Players who already finished the pulled puzzle keep their result, XP and streak for that date.
- Players with unfinished attempts get a fresh round on the replacement. Their attempts on the pulled puzzle are discarded.
- A date key still counts at most once toward streaks and weekly trails.

## Admin edits

`PATCH /api/admin/puzzles/[id]` changes as follows:

- It runs the same automated gates and asset checks as generation.
- It recomputes `answerKey` and `contentHash`, which voids the approval.
- It moves the puzzle back to `awaiting_approval`. If the puzzle was scheduled, its date becomes empty and the low-supply alerts apply.
- It rejects edits to a `live` puzzle. Pull is the only way to change a live day.
- It revalidates the `daily-puzzle` cache after any edit.

## Related fixes

- **Reserve corpus.** Merge the replenished legacy `RESERVE_PUZZLES` entries into the corpus that is actually imported. They're only imported as candidates now, but they should no longer be silently ignored.
- **Fragile reserve module.** `reserve-puzzles.ts` must not build pictograms at import time. Build each entry lazily and validate it on its own, so one missing catalog concept drops that entry instead of breaking the module.

## Client changes

**iOS and web**

- `daily_puzzle_unavailable`: show a friendly "Today's puzzle is on its way" state with automatic retry using `retryAfterSeconds`. Don't show an error.
- `validation_unavailable`: keep the guess in the composer, don't spend a guess slot, and show "Couldn't check that one. Try again."
- A "Report a problem with this puzzle" entry on the result screen.

## Rollout

1. Ship lifecycle fields, the review screen, the import, supply changes and alerts with the serving rule behind `REQUIRE_OWNER_APPROVAL=false`.
2. The owner clears the queue until there are 14 scheduled days and 7 backups.
3. Set `REQUIRE_OWNER_APPROVAL=true`. From then on, the serving rules above are the only path.

No step runs scripts against the production database from a developer machine. The one-time candidate import is an admin-triggered, idempotent server action.

## Testing

- **Unit tests:**
  - approval hash covers every content field, and edits void it;
  - serving order (scheduled, then backup, then 503) and alert firing;
  - typo-tolerance table cases, including short words that must stay exact and collisions between accepted answers;
  - `validation_unavailable` doesn't advance attempts;
  - pull keeps terminal results and resets in-progress rounds;
  - streaks count a date key once after a pull;
  - admin PATCH voids approval, refuses live puzzles and revalidates the cache.
- **Route tests:** `/api/puzzle/today` never returns 500 for a missing puzzle.
- **Admin UI tests:** approve, reject, schedule and pull flows.
- **iOS UI tests:** fixture-backed tests for the "on its way" state and the "try again" guess state.

## Out of scope

- Bonus rounds, multiple daily puzzles, new puzzle types.
- Changes to the generation engine's automated gates beyond the supply loop.
- Changes to scoring, XP or Plus.
