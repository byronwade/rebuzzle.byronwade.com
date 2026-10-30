# First-session quick-start

## Intent

Rebuzzle opens directly to a visual word puzzle, but a new player has to discover the question-mark button to learn what the clues mean. Give first-time iOS players a brief, friendly explanation before their first daily, so the first guess feels inviting instead of confusing.

## Goals

- Show the existing one-screen “How to play” guide once, after a daily puzzle has loaded.
- Explain the rebus mechanic with a sunflower example, keeping the intro distinct from today’s answer.
- Explain the scoring contract accurately: the first three guesses affect the score; players can continue solving afterward.
- Let the player start or close immediately, without submitting a guess or changing puzzle state.
- Remember that the guide was seen across app launches and puzzle days; keep the manual Help button available.
- Keep the guide readable with Dynamic Type and the current SwiftUI visual system.

## Non-goals

- No multi-step tutorial, account requirement, network request, answer disclosure, paywall, or gameplay advantage.
- No claim that the quick-start increases retention; this change addresses a documented comprehension gap and needs later player evidence.

## Product and implementation decisions

- Reuse `HelpView` with a concise first-session variant instead of building a second tutorial screen; keep the fuller manual guide intact.
- Present it automatically once the current daily puzzle is available. While loading or offline, do not cover the retry/error state.
- Persist dismissal locally with `@AppStorage`; opening the manual Help sheet also counts as seeing the guide.
- Treat an install with an existing Rebuzzle device credential as an existing player and backfill the seen flag before the first screen can present the guide.
- Use one short, accurate scoring line: “Three scored guesses. Then keep solving until it clicks.”
- Keep fixture-only first-run controls in the existing debug fixture path so all UI tests remain deterministic without adding release behavior.

## Acceptance evidence

- A fresh-install UI test sees the rebus example and scoring explanation, confirms today’s fixture answer is absent, dismisses the guide, and can make a first guess on the same puzzle without answer disclosure.
- A fixture representing an existing install with prior puzzle progress and no quick-start preference skips the automatic guide.
- Relaunching after dismissal does not present it again, while the toolbar Help button still opens the guide.
- Accessibility XXXL presentation and dismissal remain usable.
