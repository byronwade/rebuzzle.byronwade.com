# Daily puzzle quality pulse

## Intent

Give players a quick, optional way to tell Rebuzzle whether a revealed daily puzzle felt too easy, satisfying, demanding but fair, or unclear. Use those responses as one human signal when reviewing future dailies. Today’s puzzle should feel complete before this prompt appears, and the prompt must never interrupt play or gate a reward.

This supports the product goal of making one daily puzzle worth returning to by giving the editorial process evidence about perceived challenge and clue fairness. It does not promise improved retention, enjoyment, puzzle difficulty, or revenue. Responses are voluntary and self-selected, so they cannot be treated as a representative sample or as a measured solve-time score.

## Experience

After the answer and explanation are revealed, show a compact card titled “How did today’s puzzle feel?” with four one-tap choices:

- Too easy
- Just right
- Tough but fair
- The clues didn’t click

The player may change their choice while the result is open; the most recent choice replaces the earlier one for that account and local puzzle day. A selection receives a quiet, accessible selected state and a short thank-you. The prompt has no free-text field, reward, streak effect, XP, upsell, or effect on puzzle access. It appears for both solved and revealed outcomes, remains optional, and adapts to accessibility text sizes and Reduce Motion.

## Event contract

Add the authenticated `daily_quality_feedback` client event with exactly one allowed value in `rating`: `too_easy`, `just_right`, `tough_but_fair`, or `unclear`. The client sends no user ID, puzzle ID/date, answer, guess, outcome, timestamp, difficulty, or arbitrary metadata. The server derives the user ID, stable local puzzle day, and occurrence time using the existing native analytics route.

Store one current rating per account, event type, and local puzzle day. If a player changes their choice that day, update that row rather than creating another response. Keep the current unique index and 90-day retention behavior. Return aggregate counts by rating only in the existing admin-only 30-day native funnel summary. The admin screen must label the data as player-submitted and self-selected, not as objective difficulty or completion evidence.

All writes remain best-effort. An analytics failure must not change the completed game, share flow, rewards, or Plus access. Unknown ratings, unknown body fields, unauthenticated requests, and client-supplied identity/time/day fields are rejected.

## Privacy and measurement

This is account-linked Product Interaction data, because the account ID is needed to replace a rating and limit it to one current response per local puzzle day. The privacy policy and release privacy notes must explain that the app stores only the rating, local puzzle day, event type, server time, and account ID for up to 90 days in source-configured TTL, with production TTL still requiring verification. Account deletion continues to remove these rows with the existing native funnel data.

Do not display small-sample ratings as proof that a puzzle is easy, hard, fair, or fun. Aggregate counts are directional editorial input only. Never infer active solve duration from this response.

## Acceptance evidence

- Native UI shows the four choices only after a result exists, supports both solved and revealed results, and acknowledges an optional selection without altering game completion.
- Native payload tests prove the exact closed event fields and that no puzzle or answer data is included.
- Server tests prove strict rating/body validation, authenticated server-derived identity/day/time, and replacement of a prior same-day rating without creating a second row.
- Aggregation tests prove only four rating counts are returned, including zero defaults; admin output contains no account-level rows or identifiers.
- Privacy and scorecard sources describe the event and its interpretation limits.
- Targeted native and web tests, type checking, lint, and `git diff --check` pass. No live deployment, App Store privacy-label change, actual player response, or outcome lift is claimed without separate evidence.
