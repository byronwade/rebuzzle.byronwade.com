# Score-safe status in the open-solve composer

## Intent

Rebuzzle lets a player keep working on a difficult Daily after the three scored guesses are saved. Keep that promise clear while they are typing: after “Keep solving,” show a quiet status beside the pinned answer composer so the player knows the official score is locked and they can continue at their own pace.

## Context and design call

- **Audience/device:** Daily puzzle players on iPhone, including players using the keyboard and accessibility text sizes.
- **Surface:** The existing pinned answer composer during a continued, score-locked Daily.
- **Primary action:** Continue entering guesses in the existing answer field.
- **Call:** Add one compact, secondary-style status line above the composer row only after the player chooses “Keep solving” for the current score-locked puzzle. Use the existing state and theme. Keep it visible when the keyboard is open.

## Goals

- Keep the no-more-scored-guesses state visible beside the active answer field, even when the score-lock card has scrolled away.
- Show the status only for the exact puzzle the player continued.
- Preserve the existing composer, Eve nudge, score rules, daily streak, and late-solve result.
- Keep the status readable in VoiceOver order and at Accessibility XXXL.

## Non-goals

- No new scoring, guess, hint, streak, or reward behavior.
- No new persistent state, navigation, sound, haptic, animation, or timer.
- No changes to the score-lock decision card or normal scored-turn composer.

## Behavior

1. The existing score-lock decision card remains the only way to enter open solve.
2. After “Keep solving,” display “Score locked · solve at your pace” above the pinned answer composer while the same game remains score-locked and open.
3. Keep the status visible while the keyboard is open and while unscored continuation guesses receive feedback.
4. Hide it during normal scored play, before the player chooses to continue, and after the game ends or the puzzle changes.
5. Do not alter the official score. A later solve continues to use the existing late-solve result copy.

## Acceptance criteria

1. In the score-lock fixture, the status is absent before “Keep solving,” then visible after the action.
2. It remains visible and reachable with the keyboard open and at Accessibility XXXL.
3. It is absent in a normal scored round and after the result replaces the composer.
4. Existing nudge, answer entry, submit, and reveal controls remain available and correctly labeled.
5. The change uses existing theme typography/colors and adds no animation or haptic.

## Source receipts

Consulted 2026-11-03. Thorbis D-025 defers native behavior to the current Apple HIG.

| Source | Applied guidance |
|---|---|
| [Thorbis DESIGN.md, D-025](https://design.thorbis.com/design.md#apple-hig-mobile-authority) | Use Apple HIG as the native platform authority and record applicable rule IDs and evidence. |
| [Apple Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) | Keep the primary task focused and adapt the interface to Dynamic Type and device conditions. |
| [Apple Text Fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) | Preserve a clear field purpose; keep the contextual status separate from the editable answer value. |
| [Apple Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Allow the composer to reflow with larger text and changing keyboard/safe-area conditions. |

## HIG applicability and evidence

| Rule | Status | Evidence |
|---|---|---|
| HIG-008 System text and Dynamic Type | Required | UI fixture at standard and Accessibility XXXL sizes; confirm the status wraps without clipping. |
| HIG-009 Assistive interaction | Required | VoiceOver accessibility tree exposes the status before the answer field; existing field and submit labels remain unchanged. |
| HIG-011 Motion and Reduce Motion | Not applicable | No motion or haptic is added. |
| HIG-015 Honest states and recovery | Required | Status is gated on the continued puzzle ID and score-locked state; disappears when the result replaces play. |
| HIG-021 Evidence | Required | Record simulator, UI test, and build evidence in the implementation plan/PR. |

## Verification plan

- Add assertions to the existing `--ui-score-locked` UI test before implementation, verify RED, then implement and verify GREEN.
- Check that the cue persists with the keyboard open and at Accessibility XXXL.
- Build and run the relevant iOS UI test; run the full iOS UI suite if the focused case passes.
- Do not claim physical-device behavior or full release compliance without direct evidence.

## Verification record

- RED: the score-lock UI test failed at the expected assertion because `continuedSolveStatus` was absent after “Keep solving.”
- GREEN: focused UI tests passed (2/2) on iPhone 17 Pro, iOS Simulator 26.3.1. They cover the normal score-lock path through late solve and the Accessibility XXXL open-solve composer.
- Accessibility XXXL screenshot: `Daily open solve — Accessibility XXXL with keyboard`; the status wraps to three lines, stays above the answer field, and does not clip. The test also confirmed the keyboard and status are hittable.
- The full iOS suite is still running; its final result has not been recorded. No physical-device behavior is claimed.
