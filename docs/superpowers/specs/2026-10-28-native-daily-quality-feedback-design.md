# Daily Puzzle Feedback by Date

## Intent

Make the existing optional player ratings useful for improving Rebuzzle's daily puzzles. The admin funnel already shows all-platform guess and outcome patterns by puzzle date, while player ratings appear only as a 30-day total. Showing the rating counts beside their puzzle dates lets the team spot “too easy” or “unclear” days and compare those signals with how people played.

This supports the game's core promise: a daily puzzle that feels clever, fair, and worth returning to. It adds no interruption to play and does not claim that ratings prove enjoyment or difficulty.

## Current state

- The native app may ask for one optional four-choice quality rating after a daily result.
- The server stores the latest rating per account and local puzzle date in `nativeGrowthEvents`.
- The admin summary aggregates rating counts across its rolling window.
- A separate aggregate groups official puzzle attempts by local puzzle date and returns all-platform guess and outcome counts.
- Both aggregates are admin-only, and the API returns aggregate data without account IDs or puzzle content.

## Goals

- Add per-date counts for the four existing ratings to each daily puzzle-quality row.
- Align ratings with the same server-derived local puzzle date used by the gameplay records.
- Prevent ratings on a stale result from being attributed to the next puzzle after rollover.
- Keep gameplay counts labeled all-platform and ratings labeled native-app, optional, and self-selected.
- Preserve aggregate-only output and admin authorization. Do not return account IDs, raw feedback events, answers, guesses, notes, or device identifiers.
- Display a useful empty state when no ratings were submitted for the shown dates.
- Keep this source-only. Do not add client collection, production migrations, deployments, or TestFlight uploads.

## Non-goals

- No new player prompt, reward, reminder, rating option, or analytics event.
- No user-level matching between ratings and gameplay outcomes.
- No claim that player ratings are representative, objective, or proof of enjoyment.
- No changes to the visual identity of the game or the daily play flow.

## Data contract

Each existing `dailyPuzzleQuality` row gains:

```ts
nativeRatings: {
  total: number;
  too_easy: number;
  just_right: number;
  tough_but_fair: number;
  unclear: number;
}
```

The native result view sends the result's server-provided `puzzleDate` with the existing rating event. The control is available only while the result matches the current daily response and its server-provided `nextPuzzleTime` is still in the future. The server compares the submitted date to the stable account-local date it derives for the request and rejects a mismatch before storing feedback. This prevents a stale result from being counted under tomorrow's puzzle without persisting a new field or trusting a client-owned `dayKey`.

The server aggregates `daily_quality_feedback` records by `dayKey`, using the same one-day date-key buffer as puzzle attempts. Because `dayKey` is derived from each account's local timezone while `occurredAt` is UTC, the indexed timestamp prefilter must cover the full UTC interval of those buffered local dates, including one UTC calendar day on either side. The exact `dayKey` range defines which dates count. `recordDailyQualityFeedback` already replaces the prior rating for an account and puzzle date, so each stored row represents that account's latest choice for that day. The response contains date-level counts only. Missing dates receive zero counts.

The rating query uses the existing `occurredAt` index and a bounded 30-day window plus the one-day local-date buffer, with timezone-safe UTC timestamp bounds for the indexed prefilter. It adds no event type, retained event field, index, or migration; the existing event request includes `puzzleDate` for server-side current-day validation.

## Presentation

- Keep the existing all-platform gameplay table intact.
- Add a compact, accessible “Player ratings by puzzle date” table using the same date rows.
- Show response totals and counts for Too easy, Just right, Tough but fair, and Unclear.
- State that ratings are optional, self-selected native-app responses and are not matched to the all-platform player sample.
- Keep the table horizontally scrollable and keyboard-accessible, with locale-aware dates and tabular counts.
- When no responses exist, show an explicit empty state without hiding the gameplay table.
- Follow the Thorbis rules that are relevant to interaction quality—honest states, mobile touch targets, safe areas, and reduced-motion respect—while retaining Rebuzzle's own visual identity. Thorbis itself says its product styling is not generic guidance for unrelated brands.

## Privacy and access

- Preserve `verifyAdminAccess` and `Cache-Control: private, no-store` on the existing route.
- Group by date and rating inside MongoDB. Never project player identity or raw event data.
- Keep the existing four-value closed rating set and native route behavior.

## Success criteria

- Every returned active puzzle date has all four rating counts and a total, including zeros when no rating was submitted.
- Rating buckets agree with the stored latest-per-account/day records and use the same local puzzle-date key.
- The admin UI visually and semantically distinguishes all-platform attempts from native-app ratings.
- Tests cover date-boundary filtering, rating bucket aggregation, merge-by-date behavior, empty feedback, and aggregate-only output.
- The scorecard records the new source capability and its sample limitations without claiming improved enjoyment or retention.
