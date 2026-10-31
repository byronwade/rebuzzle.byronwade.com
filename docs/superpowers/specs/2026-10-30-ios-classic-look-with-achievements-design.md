# iOS: classic look with a quiet Achievements list

Supersedes the presentation half of `2026-10-30-ios-prestige-redesign-design.md`.
The challenge ladder (`2026-10-30-native-challenges-design.md`) is unchanged.

## Why

Build 16 shipped the dark Prestige redesign. Feedback: the older (build 15) look is
preferred and Prestige put far too much information on screen.

## Decision

- Every app screen returns to build 15 exactly: warm paper/ink theme, rounded display
  type, system light/dark with the Appearance setting, the original Play, Journey and
  You screens. No rank emblems or XP bars outside the existing Journey level view.
- Challenges stay live on the server and decode in RebuzzleCore. The app shows them in
  one place only: an **Achievements** row on the Journey tab.
- The row opens a plain list. Each line is title, tier dots and the next goal
  ("59 more to go"); maxed lines say "Complete". Locked secrets show as "Classified".
  Tapping a line opens a sheet listing each tier, its threshold, XP and unlock date.
- A newly earned tier shows a small banner at the top of the screen
  ("Daily devotion III unlocked · +100 XP") that auto-dismisses after a few seconds
  or on tap. Several unlocks queue one after another.
- When challenge data is missing (server not yet deployed, sync incomplete) the row
  is hidden rather than showing an "updating" state.

## Kept from the PR

- Web challenge evaluator and `/api/user/progress` `challenges` field.
- RebuzzleCore `ChallengeProgress`, `ChallengeLine`, `ChallengeUnlock` and tests.
- `AppModel.pendingUnlocks` and the preview fixtures.
- Fixes: `CODE_SIGN_ENTITLEMENTS` in `project.yml`; unlock dismissal only removes the
  shown unlock once.

## Removed from the PR

`Design/Prestige.swift`, `Features/Career`, `Features/Challenges/ChallengeUnlockOverlay`,
the `Features/Play` split, and all restyles of existing screens.

## Testing

- RebuzzleCore tests unchanged and passing.
- UI tests revert to the build 15 versions (Journey tab), plus the Achievements list
  is reachable from Journey under the preview fixture.
- Screenshots of Journey, Achievements list, detail sheet and banner in light and dark.

## Later, separately

AI player profiles from how people solve, then smarter (possibly personalised) puzzles.
