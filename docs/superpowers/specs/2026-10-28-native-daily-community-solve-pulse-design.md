# Native Daily Community Solve Pulse

## Intent

Make finishing the daily puzzle feel like joining a shared moment. After a player finishes, they can optionally see how many guesses other people needed for that same puzzle. The result is a small, spoiler-free debrief that respects the promise that a hard puzzle can take as long as it takes.

This is a product hypothesis, not a measured retention or revenue improvement. The native app already has streaks, reminders, hints, a weekly personal goal, sharing, and a paid archive/journal. A friend-only challenge would require a social graph or a configured Game Center leaderboard. The existing web weekly leaderboard is global and filters recent players while ranking cumulative points, so it is not an appropriate daily puzzle comparison.

## Goals

- Let a player who has finished an official daily open an optional, native “Today’s solving mix” view.
- Show the distribution of unique successful players’ guess counts in four buckets: 1, 2, 3, and 4+ guesses.
- Count continuation solves after the score lock in the 4+ bucket.
- Make the distribution available only after at least 20 unique solvers have completed that puzzle.
- Keep the feature free, calm, accessible, and spoiler-safe. It must never rank solve speed.
- Measure opt-in views using the existing first-party native growth event store, without attaching puzzle IDs, answers, guesses, timestamps, or hint contents to the view event.

## Non-goals

- Friend lists, friend-only groups, Game Center, public usernames, player rankings, or score competition.
- Changing daily puzzle scoring, hints, streaks, reminders, shares, plus access, or pricing.
- Collecting solve duration, raw guesses, notes, or notification contents for this feature.
- Adding notifications, ads, paywalls, or urgency messaging.
- Claiming an improvement in retention, enjoyment, conversion, or revenue before a real cohort is measured.

## Player experience

1. The completed daily result shows a collapsed, optional “Today’s solving mix” disclosure.
2. The app requests the distribution only when the player opens it. It shows a small loading state while the request is in flight.
3. If fewer than 20 unique players have solved the puzzle, it says “The mix appears after 20 players solve today’s puzzle.” It does not reveal how many have played so far.
4. Once available, the view shows four accessible horizontal bars with percentages. It identifies the player’s bucket only when they solved the puzzle. A player who revealed the answer can still see the aggregate, without a personal marker.
5. A failed request leaves the daily result usable and offers a retry. The card never blocks the answer, explanation, streak, share action, or return countdown.

Copy describes the data as “among players who solved this puzzle” and makes clear that only guess count is compared. The result is a snapshot, not a rank or contest.

## Data and API contract

Add `GET /api/puzzles/solve-distribution?puzzleId=<official-puzzle-id>`.

- Apply the existing public rate limiter and require a bounded non-empty puzzle ID.
- Resolve the puzzle on the server. Return not found for missing, unpublished, or user-submitted community puzzles.
- Aggregate only successful, final guess rows for the requested official puzzle. Deduplicate by server-owned `userId` inside MongoDB and use the minimum valid positive `attemptNumber` for each solver. Exclude finalization rows. Existing `{ puzzleId, isCorrect }` indexing supports the match; do not add an index unless verification shows the query planner cannot use it.
- Map attempts 1, 2, and 3 directly; map every attempt after 3 to 4+.
- Below 20 unique solvers, return `available: false`, the fixed threshold, and zero percentages. Do not return the exact sample size.
- At or above 20, return only four integer percentages. Round to 5-point increments with a deterministic largest-remainder rule so the percentages sum to 100. Do not return account IDs, usernames, answers, attempts, notes, or solve times.
- Use private, no-store response headers. No client-provided completion status is trusted for the aggregate.

The iOS client uses the completed game’s puzzle ID. The server is the source of truth; client-side attempt counts only select which row to highlight.

## Measurement and privacy

- Report `daily_solve_pulse_viewed` only after the player opens the disclosure. The request contains only the existing event type; the server derives identity and date as it does for other native growth events.
- Aggregate this view event by unique account-day in the existing admin-only 30-day native funnel. Do not store puzzle ID or result fields on the event.
- Preserve the existing 90-day native event retention and account-deletion behavior. This remains within the already documented product-interaction and user-ID data categories; no new data category is introduced.
- After deployment, compare opt-in views and next-day opens with a pre-feature baseline. Treat the result as directional unless a controlled experiment is later run. Use App Store Connect for verified Plus purchases; a view is not a purchase.

## Acceptance criteria

- A valid official puzzle returns a four-bucket distribution only when at least 20 unique successful players qualify.
- A low-sample response does not reveal the count or any user identity.
- Duplicate success rows count once per server user; missing, non-integer, zero, and negative attempt numbers do not enter the distribution.
- Correct fourth and later continuation guesses count in 4+; revealed/expired finalization rows do not count as solves.
- Percentages are bounded, multiples of five, and sum to 100 when available.
- Community puzzles and unknown/unpublished IDs cannot be queried.
- The native view loads on demand, retries after failure, supports Dynamic Type and VoiceOver, and does not affect gameplay or purchase state.
- The view event carries no puzzle or answer data, appears only after expansion, and is included in the aggregate-only 30-day admin summary.
- Existing daily, share, growth-event, purchase, and account-deletion behavior remains intact.
