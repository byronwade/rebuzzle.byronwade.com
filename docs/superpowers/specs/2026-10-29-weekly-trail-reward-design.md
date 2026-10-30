# Weekly Trail Reward

## Intent

Rebuzzle already invites players to finish the daily puzzle on three days each week, but completing that trail currently has no distinct reward. Add a modest, repeatable bonus that makes the existing weekly goal feel worth completing and gives the Journey screen a clear payoff.

This is a retention improvement for the free daily loop. The existing Plus archive and personal-history offer remain the paid product; the weekly trail, daily puzzle, hints, and its reward stay free.

## Goals

- Award 50 XP for every Monday–Sunday week in which the player finishes official daily puzzles on at least three distinct puzzle dates.
- Count any valid terminal daily result: a solve or a completed failure. Extended play after the three scored guesses must count when its terminal attempt is valid.
- Derive the award from the server-owned daily-progress rows so refreshes, retries, duplicate rows, and multiple devices cannot multiply it.
- Include the reward in lifetime XP and levels. Include an explicit current-week reward state in `/api/user/progress`, tied to the server-provided week start.
- Show the reward before it is earned and celebrate it after completion in the existing native Weekly Trail card.
- Preserve response compatibility with app versions that predate the new field.

## Player experience

The Journey card shows the current Monday–Sunday dates, progress from 0/3 to 3/3, and the bonus amount. Before completion, its reward copy is: “Finish 3 puzzle days this week to earn +50 XP.” When earned, it changes to “+50 XP earned this week” with the completed trail state. VoiceOver announces both progress and reward state.

Missing a day does not erase progress already made within the current week. There is no penalty, paid shortcut, ad, or scarce resource attached to the trail.

## Server and data rules

- The stable Journey time zone and puzzle-date string determine the player’s calendar week. Weeks run Monday through Sunday, matching the existing `/api/user/progress` contract.
- A puzzle date contributes at most one completion, regardless of retries or duplicate projections.
- A completed week adds exactly 50 XP to lifetime XP. Compute the bonus from unique completed dates grouped by week; do not write a separate award row. This makes the payout naturally idempotent across repeated requests.
- Previously recorded qualifying weeks count retroactively. This keeps the aggregate deterministic and rewards behavior already represented in the player’s server history.
- The current-week API reward object contains its `weekStart`, `bonusXP`, and `earned` state. An incomplete backfill returns no reward state, just as it withholds partial totals today.
- A normal-mode solved entry may have 1–3 attempts and a normal failed entry has exactly 3. Extended-mode terminal entries may have more than 3 attempts; those are valid only with `playMode: "extended"`.
- Archives and practice rounds do not contribute; the existing materializer already excludes them.

## Constraints and compatibility

- Keep XP and level totals server-owned. SwiftUI displays the API reward state; it does not award XP locally.
- Keep the current lifetime badge identifiers separate from this repeatable weekly reward.
- New response fields are optional on iOS so an app update can safely reach a server that has not yet deployed the expanded response.
- Older clients ignore the additive response fields and continue to read existing progress.
- No database migration is required because the reward is derived from existing daily-progress entries.

## Success evidence

- Server tests prove one 50 XP reward for each qualifying week, zero for a 2-day week, one completion per distinct puzzle date, no duplicate payout, and valid extended-mode terminal entries.
- Core Swift tests prove the new reward state and extended-mode entries decode correctly while legacy payloads without either field still decode.
- A native UI test starts at 2/3, sees the reward offer, completes today’s puzzle as the third day, and sees the server-returned +50 XP reward and updated XP total.
- The web route test, Core Swift tests, and native UI test pass.

## Product assumptions

- 50 XP is the initial reward balance. It is a small portion of a 300 XP level and is not based on a measured retention experiment.
- The connected PostHog project currently exposes no Rebuzzle-specific gameplay events, so this value should be reviewed after the correct Rebuzzle analytics source is available.
- The design optimizes for a satisfying daily ritual and a transparent paid archive, not pressure-based streak loss or pay-to-win rewards.
