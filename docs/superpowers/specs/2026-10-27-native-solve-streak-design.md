# Native daily solve streak design

## Intent

Make Rebuzzle’s once-a-day rhythm feel rewarding by showing players how their daily solving streak is progressing. The SwiftUI app already grants XP, stars, badges, a weekly trail, and a countdown, but it does not surface the current and best daily streaks that the server already calculates. A small, calm streak presentation can make progress feel personal and give players a reason to return for tomorrow’s puzzle.

This is a free-play engagement feature. Plus remains an optional one-time purchase for the personal journal and deeper insights. The streak does not grant a gameplay advantage and is never sold.

## Goals

- Show the server-authoritative current and best daily streak in the completed-puzzle result and Journey.
- Make a solved day feel celebratory and a failed day feel recoverable.
- Show progress toward a small set of recognizable milestones without inventing XP or paid rewards.
- Refresh streak values after a terminal daily attempt and never present an old value as if it reflects the just-completed puzzle.
- Keep the feature readable with Dynamic Type and VoiceOver, and visually consistent with Rebuzzle’s existing reward cards.

## Non-goals

- Do not change server streak calculation, streak freezes, weekly goals, puzzle timing, attempts, or XP.
- Do not add push notifications, streak warnings, guilt-based copy, a streak freeze purchase, or any other paid protection.
- Do not change the Expo prototype, backend schema, endpoint, or App Store purchase product.
- Do not claim a retention or revenue lift from implementation alone.

## Product behavior

### Completed result

Add a compact daily-streak card immediately after the solved-result panel and before the XP reward card. This puts the daily return loop in the solve payoff while keeping earned XP directly below it.

- A successful solve shows the current streak, best streak, and the next milestone when one remains.
- Reaching a milestone (3, 7, 14, or 30 days) receives a clear, warm celebration in the card. The card does not imply a new XP, badge, or purchase reward.
- A failed daily attempt uses the server’s held streak value when one exists and says the run is safe for today; it invites the player to return tomorrow without treating the reveal as a failure of character.
- A new player sees an encouraging first-step message. Missing statistics or a failed refresh do not render a fabricated zero or stale count.
- While the post-completion stats request is in flight, show a brief loading state. If it fails, say the streak will refresh when Journey syncs; the rest of the result remains usable.

### Journey

Make the “Daily streak” panel the first progress card on Journey, before the broader level summary. It shows current streak and best streak from the same server-owned stats response, with progress toward the next milestone. If stats have not loaded, hide the numeric panel or show a clear syncing state; never calculate consecutive days on-device.

### Source of truth and freshness

Use `PlayerStats.streak` and `PlayerStats.maxStreak` returned by `GET /api/user/stats`. The backend’s existing rules are authoritative: wins advance the streak, a non-win holds the value, and configured server-side streak protection handles missed days. The iOS UI must not recompute dates or alter these rules.

When a terminal daily guess is accepted, mark the streak refresh as pending before updating the visible result. Clear it only when the subsequent stats request succeeds. If the request fails, preserve the last stats for other screens but do not label them as the just-completed result’s current streak.

## Design and copy direction

Use a custom Rebuzzle reward panel: ink background treatment, warm reward accent, restrained spark/ring motif, large monospaced day count, and a small “best” record. Make progress copy explicit (for example, “2 days left” under “Next mark”), rather than relying on shorthand such as “2 to 3.” Avoid a generic fire emoji as the whole design. Reuse existing spacing, card radius, typography, and accessibility patterns in `JourneyRewards` and `JourneyLevelView`.

Copy should celebrate effort without threatening loss. Examples: “Aha, three days running.”, “Your streak is safe for today.”, and “Every great run starts with one solve.” Do not use “Don’t break your streak,” shame language, countdown-to-loss warnings, or copy that says the user must return.

Milestone thresholds are 3, 7, 14, and 30 days. Show the next threshold only when the current count is below 30; after 30, show the current and best values without an artificial forever-climbing bar.

## Technical constraints

- The TestFlight product is the native SwiftUI app under `apps/ios`; the separate Expo app under `apps/mobile` is outside this change.
- `AppModel` already loads `PlayerStats` on startup and requests updated stats after a terminal guess. Make freshness explicit in model state rather than adding another request path.
- Keep the model testable without introducing UI inspection dependencies. A small pure streak presentation model may live in `apps/ios/Core` if it cleanly captures milestone selection and copy state.
- Existing Plus access, journal privacy, notification preference, and game flow remain unchanged.

## Acceptance criteria

1. A solved daily result displays the fresh server streak and best, and celebrates exactly when the new streak reaches 3, 7, 14, or 30.
2. A failed daily result displays the held server streak with supportive copy, or a first-step state when no streak is active.
3. Journey shows current and best streak from server stats and does not derive values from local dates or journal entries.
4. During and after a failed stats refresh, the result never displays stale streak values as current; gameplay, sharing, and navigation remain available.
5. Dynamic Type, VoiceOver labels, light/dark themes, and Reduce Motion remain supported.
6. Tests cover absent stats, a fresh player, milestone boundaries, win/loss result presentation, and post-completion stats refresh.
7. Existing iOS unit tests and Core package tests pass.

## Success evidence

This change creates a visible, truthfully sourced return loop. Its retention and monetization effect remains unproven until the new build ships and is observed in production. Compare account-day opens, finishes, and multi-day returners before and after release; assess Plus sales separately through App Store Connect.
