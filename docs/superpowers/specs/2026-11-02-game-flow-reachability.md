# Game flow action reachability

## Goal

Keep the player’s next action visible during active play and make the result screen feel complete before secondary Journey details.

## Findings and intent

- Eve’s reply and the next nudge control share the scroll view, while the answer composer stays pinned at the bottom. The current auto-scroll targets the revealed hint text, leaving the next nudge control below the composer.
- The result screen currently puts the tall Journey rewards card before sharing and the next-daily card, pushing those actions past the initial viewport. The streak reward also appears after XP, opposite the intended completion hierarchy.
- The active-play daily masthead remains visible after a solve, repeating the daily title and date above the result card and crowding out share and countdown actions.

## Design

- After a hint or a wrong guess, bring the next nudge action into view above the pinned answer composer. When no authored hints remain, keep the latest conversation turn as the scroll destination.
- Hide the active-play daily masthead after a result and use the result itself as the scroll destination.
- Order the result as: solve/reveal, streak celebration, spoiler-safe share, next-daily countdown/reminder, Journey rewards and detailed statistics.
- Keep answer-blind feedback, draft and guess state, reminder settings, existing art, and navigation behavior.
- Do not weaken the viewport assertions or add urgency language.

## Acceptance criteria

1. After revealing a hint, the next nudge action is visible above the answer field when one remains; the last hint still disappears cleanly.
2. The result streak is shown before XP, and share plus next-daily countdown/reminder are reachable in the initial result viewport.
3. Sharing remains spoiler-safe; reminder continues to use existing local scheduling.
4. Standard and Accessibility XXXL UI flows remain usable.

## Sources

- Thorbis [Native contract](https://design.thorbis.com/skills/native), [UI skill](https://design.thorbis.com/skills/ui), and [design system](https://design.thorbis.com/design.md); D-025 and HIG-001–HIG-022 apply.
- Apple [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), and [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), consulted 2026-11-02.

## Native applicability matrix

| Rule | Applies | Status/evidence |
|---|---|---|
| HIG-001 Scope and source receipts | Yes | Pass: scope and sources recorded above. |
| HIG-002 Platform authority | Yes | Pass: existing SwiftUI page, scroll, and navigation are retained. |
| HIG-003 Native components/materials | Yes | Existing SwiftUI components are reordered; no custom system chrome. |
| HIG-004 Touch geometry | Yes | UI tests confirm the nudge, share, countdown, and 44-point reminder action are reachable; physical-device target measurement is pending. |
| HIG-005 Navigation | Yes | Existing routes unchanged. |
| HIG-006 Sheets/dismissal | No change | No sheet or dismissal changes. |
| HIG-007 Safe areas/keyboard | Yes | Nudge order is tested above the pinned answer composer; the solved countdown and reminder pass first-viewport checks. |
| HIG-008 System text/Dynamic Type | Yes | Standard result viewport, Accessibility XXXL puzzle-study route, and Accessibility XXXL result-share reachability are covered by simulator UI tests. |
| HIG-009 Assistive interaction | Yes | Existing labels/identifiers retained; VoiceOver runtime check pending. |
| HIG-010 Appearance/contrast | Existing tokens | No color change; no new contrast claim. |
| HIG-011 Motion | Existing motion | Existing Reduce Motion-aware scroll animation retained. |
| HIG-012 Haptics | No change | No haptic changes. |
| HIG-013 Input/editing | Yes | Answer draft must survive opening the puzzle study screen; direct UI assertion added. |
| HIG-014 Permissions/privacy | No change | Reminder permission and privacy behavior unchanged. |
| HIG-015 Honest states/offline | No change | Existing loading, reminder, and share states reused. |
| HIG-016 iPad adaptation | Yes | Existing adaptive layout retained; iPad runtime not tested. |
| HIG-017 Symbols/language/direction | No change | Existing symbols and language retained. |
| HIG-018 Measured performance | Yes | No performance claim; physical-device measurement pending. |
| HIG-019 Media/capture | No change | Spoiler-safe sharing remains unchanged. |
| HIG-020 Shared contracts | No change | No cross-platform contract changes. |
| HIG-021 Evidence | Yes | Nudge conversation, result share, countdown/reminder, and streak-order UI tests pass on iPhone 17 Pro simulator (iOS 26.3.1); toolbar draft-preservation tests pass in standard and Accessibility XXXL; Accessibility XXXL result sharing passes. The full CI run at the predecessor head failed 16 tests and has not been refreshed. |
| HIG-022 Review/maintenance | Yes | Follow-up code review found no actionable issues; refreshed CI remains pending. |

## Release evidence still required

Record build and commit; re-run full iOS CI; check VoiceOver order and a physical iPhone before claiming release readiness. The previous full CI run at the predecessor head failed 16 tests on iOS 26.0.1. The locally reproduced nudge, share, countdown, reminder, and streak-layout regressions now pass their focused simulator tests. Accessibility XXXL result sharing also passes, with a non-failing “Invalid frame dimension (negative or non-finite)” warning logged while focusing the answer field; its source has not been identified.
