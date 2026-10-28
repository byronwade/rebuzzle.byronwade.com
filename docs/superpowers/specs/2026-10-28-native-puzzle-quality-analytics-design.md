# Native Puzzle Quality Analytics

## Intent

Help the Rebuzzle team see whether each daily puzzle is being solved quickly, taking several guesses, revealed, abandoned, or left in progress. The existing admin funnel reports returns and purchases, but it does not show puzzle-level attempt patterns. These signals will help tune difficulty and identify confusing puzzles before making claims about enjoyment or retention.

## Scope

- Extend the authenticated admin funnel with aggregate counts for the latest 30 active official puzzle dates.
- Group by the recorded local `puzzleDate` and server-side player identity. Return only date-level player totals, guess-count buckets, and terminal outcomes.
- Include all platforms that write to the shared `puzzleAttempts` collection; the stored records do not identify platform.
- Count only actual guess rows as guesses; synthetic finalization rows never count as guesses.
- Distinguish solved, revealed, expired, ran-out, and still-in-progress player-days.
- Show the aggregates in the existing Native Daily Funnel admin card, with clear labels and an empty state.

## Constraints

- Read existing `puzzleAttempts` records; do not add client events or collect guesses, notes, or notification contents.
- Keep identity grouping inside MongoDB. The response must not include account IDs, answers, or raw attempt rows.
- Preserve administrator authorization and `private, no-store` response headers.
- Add an index for the recent `puzzleDate` query through the existing index registry.
- Existing timing values do not reliably measure time from puzzle presentation to completion. Any later elapsed measure needs a separately specified, server-verified session start and must be labeled wall-clock time, never active thinking time.
- This change remains source-only. It does not deploy the API, run a database migration, or upload a TestFlight build.

## Product calls

- Use four mutually exclusive guess buckets: one, two, three, and four-or-more guesses.
- Treat a player-day with guesses but no terminal record as in progress, not as a failure.
- Use recorded local puzzle dates, with a one-day UTC buffer at each edge, and return the 30 most recent dates with guess activity.
- Label these as all-platform, server-recorded daily puzzle attempts; they do not include activity that never reached the server.

## Success criteria

- Admins can compare guess and outcome distributions by puzzle date.
- The API continues to return aggregate-only data and fails closed when its Mongo aggregation fails.
- The dashboard describes the measurements and limitations without implying that attempt counts prove enjoyment or hours spent.
- Existing funnel behavior and client analytics collection remain unchanged.
