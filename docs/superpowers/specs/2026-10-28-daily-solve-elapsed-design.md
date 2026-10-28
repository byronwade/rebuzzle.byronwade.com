# Daily puzzle elapsed-to-solve measurement

## Intent

The game is meant to reward a satisfying solve that players can think about and return to. Existing attempt counts show how many guesses a player submitted, but they do not say how long passed between the first verified daily session and a correct solve. Add one server-owned, privacy-conscious signal to help editors calibrate difficulty after a real player cohort exists.

## Metric definition

For each official puzzle date, report the median wall-clock hours from the first successfully recorded, authenticated, server-verified restore of that day's puzzle session to a correct solve. Both daily clients request session restoration as part of initial puzzle setup, even when there are no saved guesses, so this approximates initial presentation with a small request delay. It does not prove visual attention or the exact first render. The value includes time when the game is idle or backgrounded. It is not active play time or a measurement of how long someone was thinking.

Only include solves with both a first-session-restore timestamp and a matching successful `daily_finished` event for the same authenticated account and server-derived puzzle date. Ignore negative intervals and dates with fewer than five qualifying solves. Do not infer duration for reveals, timeouts, or other non-solved outcomes.

## Data flow

- On `GET /api/puzzle/session`, after authentication and the route's existing server-side check that the returned session belongs to the current official daily puzzle, write a `daily_session_restored` event through the existing idempotent native growth event store.
- Set the event identity from the authenticated `userId`; set `dayKey` from the verified server puzzle date; set `occurredAt` on the server. Do not accept client-supplied identity, puzzle date, timestamp, or source for this event.
- The event is server-only. The public native analytics endpoint must continue to reject client attempts to submit this event type.
- If writing the event fails, keep returning the puzzle session and retry on a later session restore. The first successful insert defines the recorded start; do not claim to backfill an earlier unrecorded restore.
- Pair the event with the existing server-recorded `daily_finished` event for the same account and day, requiring `outcome: "solved"` and a finish timestamp no earlier than the restore timestamp.
- Aggregate inside Mongo by puzzle date. The admin API returns a date-level median only; it never returns account IDs, individual intervals, attempts, answers, or notes.

## Privacy and product constraints

- Add no client event or new client field. Store only the first verified session restore per account and puzzle date using the existing idempotent event pattern and 90-day analytics TTL.
- Do not store or report guesses, private notes, notification contents, or user-level intervals.
- Update the internal privacy draft and public policy to explain the timestamp and its wall-clock limitations before deployment. Recheck the live App Store privacy labels and production TTL before release.
- A failed analytics write must not prevent the puzzle session from loading. A later successful retry may shorten the measured interval, so the admin label must say "first recorded session restore."
- This change is source-only. It does not deploy, run a production migration, or upload a TestFlight build.

## Acceptance

- Only an authenticated session for the current official daily records a `daily_session_restored` event; archive, old-day, and unauthenticated requests do not.
- Repeated restores preserve the original timestamp for that account and puzzle date.
- The admin summary includes a median only when at least five valid solved sessions exist for that date; all other cases return no timing value.
- The admin UI calls the value wall-clock time from first verified session restore to correct solve and explicitly says that idle/background time is included.
- Existing attempt-count and outcome aggregates remain unchanged, and client-supplied analytics cannot forge the new server-only event.
