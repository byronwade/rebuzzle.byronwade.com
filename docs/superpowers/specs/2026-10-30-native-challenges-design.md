# Native Challenges

## Intent

The native app shows four one-step badges on Journey. Players asked for a Call of Duty–style achievements wall: every challenge visible, locked ones included, with long tiered grinds and live progress bars. Replace the four badges with a tiered challenge ladder derived from the same server-owned daily-progress history that already drives XP, levels, and the weekly trail.

This is part one of two. Part two (`2026-10-30-ios-prestige-redesign-design.md`) restyles every tab in the matching Prestige look; this spec covers the data, API, and the challenges wall itself.

## Goals

- Expose 11 visible challenge lines with five tiers each, plus three single-tier secret lines, in `/api/user/progress`.
- Every tier is reachable at one scored daily puzzle per day. Top tiers take a year or more of real play.
- Progress is retroactive: existing history counts on first request after deploy.
- Each unlocked tier adds XP to lifetime XP and levels. Completing every line in a category earns that category's mastery.
- The four existing badges keep their identifiers and meaning; each corresponds to a tier I in the ladder.
- Show the whole ladder in a native challenges wall and celebrate new tier unlocks after a daily completes.

## Non-goals

- The 100-item web catalog in `packages/game-logic` stays the web's achievement system. Its speed, leaderboard, multi-game-per-day, and difficulty lines can't be reached in the daily-only native loop.
- No equipable calling cards or banners in this iteration.
- Archive practice and Plus rounds never contribute (the materializer already excludes them).

## Challenge lines

Thresholds are counts unless noted. Tier XP: I = 25, II = 50, III = 100, IV = 200, V = 400 (775 per full line).

| Category | ID | Title | Measures | I | II | III | IV | V |
|---|---|---|---|---|---|---|---|---|
| Devotion | `dailies` | Daily devotion | Distinct puzzle dates finished (solved or failed) | 1 | 7 | 30 | 100 | 365 |
| Devotion | `streak` | Unbroken | Longest run of consecutive finished puzzle dates | 3 | 7 | 30 | 100 | 365 |
| Devotion | `trails` | Trailblazer | Monday–Sunday weeks with ≥3 finished dates | 1 | 4 | 12 | 26 | 52 |
| Devotion | `perfect-weeks` | Perfect week | Monday–Sunday weeks with all 7 dates finished | 1 | 4 | 12 | 26 | 52 |
| Precision | `first-guess` | Mind reader | Solves on attempt 1 | 1 | 5 | 20 | 60 | 150 |
| Precision | `unassisted` | No nudge needed | Solves with `hintCount == 0` | 3 | 15 | 50 | 150 | 300 |
| Grit | `solves` | Puzzle breaker | Solved entries | 1 | 10 | 50 | 150 | 300 |
| Grit | `clutch` | Last word | Normal-mode solves on attempt 3 | 1 | 5 | 15 | 40 | 100 |
| Grit | `extended` | Never quit | Extended-mode solves (`playMode: "extended"`, outcome solved) | 1 | 5 | 15 | 40 | 100 |
| Rhythm | `early-bird` | Early bird | Finishes whose `completedAt` is before 08:00 in the entry's time zone | 1 | 5 | 20 | 50 | 100 |
| Rhythm | `night-owl` | Night owl | Finishes whose `completedAt` is 22:00 or later in the entry's time zone | 1 | 5 | 20 | 50 | 100 |

Secret lines (category Secrets, single tier, 100 XP each). Until unlocked, the API returns them with `secret: true`, no title or description, and no progress value.

| ID | Title | Rule |
|---|---|---|
| `new-year` | Fresh start | Finish the puzzle dated January 1 |
| `halloween` | Trick or treat | Finish the puzzle dated October 31 |
| `leap-day` | Once in four | Finish the puzzle dated February 29 |

Rules shared by all lines:

- A puzzle date contributes at most once per line, reusing the existing de-duplicated entries.
- Entries with no valid `timeZone` never count toward Rhythm lines.
- `streak` measures the best run, not the current run, so missing a day never takes away an unlocked tier.

Existing badge mapping, unchanged identifiers in `badges`:

| Badge | Equivalent tier |
|---|---|
| `first-finish` (First spark) | `dailies` I |
| `first-guess-solve` (Mind reader) | `first-guess` I |
| `three-unassisted-solves` (On a roll) | `unassisted` I |
| `seven-finishes` (Seven wonders) | `dailies` II |

## Mastery

A category is mastered when every line in it is at tier V (Secrets: all three found). Mastery is display-only; it adds no XP beyond the tiers that earned it.

## API

`GET /api/user/progress` adds an optional `challenges` object to the existing response alongside `summary`:

```json
{
  "challenges": {
    "tiersUnlocked": 12,
    "tiersTotal": 58,
    "challengeXP": 625,
    "categories": [
      { "id": "devotion", "title": "Devotion", "mastered": false }
    ],
    "lines": [
      {
        "id": "dailies",
        "category": "devotion",
        "title": "Daily devotion",
        "description": "Finish daily puzzles",
        "secret": false,
        "value": 41,
        "thresholds": [1, 7, 30, 100, 365],
        "tier": 3,
        "unlockedAt": ["2026-08-02", "2026-08-08", "2026-09-01", null, null]
      }
    ]
  }
}
```

- `tier` is the count of unlocked tiers (0–5, or 0–1 for secrets).
- `unlockedAt[i]` is the puzzle date on which tier `i + 1` was first reached, derived by replaying entries in puzzle-date order. Null when locked.
- Locked secrets return `title: null`, `description: null`, `value: null`, and `thresholds: [1]`.
- `summary.totalXP` includes `challengeXP`. `level` and `xpIntoLevel` keep their existing formulas over the new total, so older clients stay valid: their decoder checks `xpIntoLevel < 300` and badge IDs, both still true.
- When backfill is incomplete, `challenges` is omitted, matching how partial totals are withheld today.

## Server design

- Add a pure module `apps/web/src/lib/challenges/` with:
  - `definitions.ts`, the table above as data.
  - `evaluate.ts`, a function `evaluateChallenges(entries)` that returns the `challenges` object. It takes the normalized `JourneyEntry[]`, so it has no database access.
- `summarize()` in `apps/web/src/app/api/user/progress/route.ts` calls `evaluateChallenges` once and adds `challengeXP` to `totalXP`.
- Time-of-day uses `Intl.DateTimeFormat` with the entry's `timeZone` to read the local hour of `completedAt`.
- Vitest coverage for every line's boundaries: thresholds exactly met, duplicate dates, failed vs solved, extended mode, missing time zone, best-streak across a gap, week grouping on Monday boundaries, leap-day dates, secret redaction, and `unlockedAt` replay order.

## Native design

- `RebuzzleCore`: decode `challenges` as optional. Strict validation (non-negative values, five ascending thresholds or one for secrets, `tier` consistent with `value`), with the same throwing pattern as `JourneyProgressSnapshot`.
- **Challenges wall**, pushed from Journey (renamed Career in part two):
  - Header with tiers unlocked out of total, and mastery count.
  - Category filter chips: Devotion, Precision, Grit, Rhythm, Secrets.
  - One row per line: icon, title with roman tier, "value / next threshold", progress bar, five diamond tier pips.
  - Locked lines stay fully visible in a muted style. Locked secrets show a lock and "Keep playing to reveal it."
  - Tapping a row opens a detail sheet with every tier's threshold, XP, and unlock date.
- **Unlock moment**: after a daily completes, the app refreshes progress and compares it with the cached snapshot. Each newly unlocked tier shows a full-screen card with emblem, title, tier, and +XP. Haptics and a tier-up animation play, and multiple unlocks queue. Reduce Motion swaps the animation for a fade. VoiceOver announces "Challenge unlocked: Daily devotion three, plus 100 XP."
- The four Journey badge cards are removed. Journey shows the three challenges closest to their next tier, plus a "View all challenges" entry.
- Preview fixtures (`--preview`) gain a mid-progress challenges payload so the wall and the unlock card can be screenshotted.

## Compatibility and rollout

- Additive response field. Build 15 and earlier ignore `challenges` and see a higher `totalXP` and level.
- An app build containing the wall must tolerate a server without `challenges`. In that case the wall shows an honest "Challenges are updating" state instead of zeros.
- TestFlight shows real challenge progress only after the web change is deployed to production. That is the existing backend deployment gate in `apps/ios/Release/Checklist.md`.
- No database migration. Everything is derived from existing daily-progress rows.

## Accessibility

- Progress bars and tier pips expose a combined accessibility value, e.g. "Tier 3 of 5, 41 of 100".
- All copy respects Dynamic Type.
- Gold-on-dark text meets 4.5:1 contrast.
- Roman numerals are read as numbers by VoiceOver.
