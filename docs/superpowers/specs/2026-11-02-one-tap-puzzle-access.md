# One-tap puzzle access during feedback

## Goal and moment

After a guess, Eve’s feedback and the answer controls can be on screen while the puzzle board has scrolled above them. Keep the puzzle immediately retrievable from any scroll position, so players can check the clue and resume the same turn without hunting through the conversation.

## Design

- Add a persistent native toolbar action labeled **View puzzle** during daily play.
- Reuse TodayView’s existing `study` state and `PuzzleStudyView`, which show the current puzzle and close back into the active game.
- Keep the existing board expand control, guess flow, keyboard dismissal, and feedback unchanged.
- The action is a quick reference route, not a second board or a new scrolling gesture. Do not add reminder behavior or pressure language.

## Acceptance criteria

1. After a wrong guess and Eve response, **View puzzle** remains reachable without scrolling the game content.
2. It opens the current puzzle in the existing study presentation and returns to the same feedback, guess count, and answer draft.
3. VoiceOver gets the explicit label “View puzzle”; use the system-managed iOS toolbar control rather than a custom undersized hit area.
4. Standard and accessibility Dynamic Type layouts remain usable; the toolbar action does not obscure the existing help action.

## Out of scope

No sticky preview, full-screen layout refactor, board rendering change, feedback content change, or TestFlight submission.

## Thorbis / Apple sources

- Thorbis [Native contract](https://design.thorbis.com/skills/native), [UI skill](https://design.thorbis.com/skills/ui), and [design system](https://design.thorbis.com/design.md); D-025 and HIG-001–HIG-022 apply.
- Apple [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) and [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), consulted 2026-11-02.

## Native applicability matrix

| Rule | Applies | Status and evidence |
|---|---|---|
| HIG-001 Scope/source receipts | Yes | Pass: scope and source receipts recorded above. |
| HIG-002 Platform authority | Yes | Pass: use the existing native SwiftUI navigation toolbar. |
| HIG-003 Native components/materials | Yes | Reuse native toolbar button and existing study presentation. |
| HIG-004 Touch geometry | Yes | Use a system-managed navigation toolbar control; UI test confirms it is hittable. Effective target geometry still needs physical-device confirmation. |
| HIG-005 Navigation | Yes | Action opens the existing puzzle study destination. |
| HIG-006 Sheets/dismissal | Yes | Reuse the existing close behavior; verify return to active play. |
| HIG-007 Safe areas/keyboard | Yes | Toolbar stays in system navigation chrome; keyboard behavior unchanged. |
| HIG-008 System text/Dynamic Type | Yes | Standard and Accessibility XXXL UI flows confirm the toolbar action and Help remain reachable. |
| HIG-009 Assistive interaction | Yes | Explicit “View puzzle” label and test identifier; VoiceOver runtime test pending. |
| HIG-010 Appearance/contrast | Existing tokens | No new color; contrast measurement not performed for this control. |
| HIG-011 Motion | No change | No custom motion added. |
| HIG-012 Haptics | No change | No haptic added. |
| HIG-013 Input/editing | Yes | Standard and Accessibility XXXL UI flows preserve the exact unsent answer draft after returning from Study. |
| HIG-014 Permissions/privacy | No change | No new permission or private data use. |
| HIG-015 Honest states/offline | No change | Existing daily puzzle and study state are reused. |
| HIG-016 iPad adaptation | Yes | Existing NavigationStack presentation is retained; iPad runtime not tested in this slice. |
| HIG-017 Symbols/language/direction | Yes | Use a familiar system symbol, localized through an explicit accessibility label; localization beyond English not tested. |
| HIG-018 Measured performance | Yes | No performance claim; physical-device measurement not performed. |
| HIG-019 Media/capture | No change | No media or capture change. |
| HIG-020 Shared contracts | No change | No cross-platform contract change. |
| HIG-021 Evidence | Yes | Toolbar, return-state, and draft-preservation UI tests pass on the iPhone 17 Pro simulator (iOS 26.3.1). Full CI has not been refreshed. |
| HIG-022 Review/maintenance | Yes | Follow-up code review and refreshed CI pending. |

## Release evidence still required

Record build/commit and affected screens; run the targeted interaction and accessibility-size UI tests; check VoiceOver order and iPad presentation; include physical-device performance and accessibility evidence before claiming native release readiness. The targeted simulator tests pass; no physical-device evidence is available in this task.
