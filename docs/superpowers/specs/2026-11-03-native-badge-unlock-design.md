# Native Journey badge unlock moment

## Intent

Rebuzzle already awards four server-defined Journey badges and shows their progress on the trophy shelf. A completed daily puzzle can earn one or more of those badges, but the result currently moves straight from stars and XP to the weekly trail. Add one restrained, one-time unlock moment so a real milestone feels collectible and the player can understand why it appeared.

## Context

- **App/platform:** Rebuzzle, native SwiftUI for iOS and iPadOS; iOS 18 minimum.
- **Audience/device:** a daily puzzle player reading the result on iPhone, with iPad layout kept adaptive.
- **Profile/pattern/surface:** Game; existing result/reward pattern; an inline region inside `JourneyRewards`, not a new route, sheet, or overlay.
- **Depth/action:** standard; the result’s primary action remains continuing to Journey or sharing, as currently ordered.
- **Owning context:** `build-ios-apps:swiftui-ui-patterns` plus the mandatory Thorbis Native contract under D-025.
- **User authorization:** standing approval to implement and continue without design questions applies.

## Goals

- Celebrate only badge IDs newly present in a complete server-owned Journey snapshot after the same account’s confirmed daily result.
- Reuse the existing four `JourneyProgress.Badge` definitions and server award rules.
- Show all newly earned badges together if one result crosses more than one milestone.
- Make the moment visible and understandable without color, haptics, or motion being the only signal.
- Keep the result’s weekly trail and existing success/failure states intact.

## Non-goals

- No new badges, quests, XP values, server endpoints, achievement taxonomy, purchase prompts, streak pressure, or competitive rankings.
- No client-side badge eligibility calculation or optimistic unlock.
- No new haptic. The existing result haptic remains the only completion haptic.
- No replay on app launch, restore, account upgrade, manual Journey refresh, or when revisiting an old result.

## Behavior

1. When `submit` or `revealAnswer` receives a terminal daily `GameSession` from the server, capture badge IDs and recorded result keys from the same player’s complete Journey snapshot already in memory. Scope the check to that account, puzzle ID, and puzzle date.
2. Refresh Journey progress as today. A badge event is eligible only when the returned snapshot is complete, contains a summary, and `includesResult(forPuzzleID:puzzleID,puzzleDate:)` confirms that exact result.
3. Compare the refreshed result keys to the baseline. The completed puzzle must be the only newly recorded result; if another result appeared while the refresh was delayed, attribution is ambiguous. Because `recentEntries` is bounded while the server summary covers older rows, also require `finishes`, `solves`, `firstGuessSolves`, and `unassistedSolves` to advance by exactly the contribution of the matching server entry. Derive it using the same summary rules (`hintCount == 0` is the only unassisted case; `nil` contributes zero). Any extra or unexpected counter change means another row may have affected the summary, so show no badge event.
4. Compute the display set as `confirmedSummary.badges − baselineBadgeIDs`. If the baseline is unavailable, the account or puzzle does not match, the snapshot is incomplete/offline, result attribution is ambiguous, any badge-driving counter delta differs from the completed result, or the set is empty, create no unlock event.
5. Keep pending checks and resulting unlock events transient in `AppModel`. A later successful refresh may resolve a still-pending check while that daily result remains active, but only if it can establish the same unique result attribution. `JourneyRewards` consumes the unlock once for the matching result, so returning to the result does not replay the celebration. Clear pending checks and events when account identity changes or the active daily puzzle rolls over, since the matching result view is no longer reachable.
6. Render a compact “Badge unlocked” treatment inside the existing reward surface, before weekly progress. Reuse each badge’s system symbol, title, detail, and `Theme` colors. Do not add a second nested card or a new action.
7. Use a brief, interruptible reveal tied to the confirmed state. Reduce Motion removes movement while leaving the status and badge fully visible. VoiceOver receives one concise announcement when the server confirmation arrives; the visible row remains the accessible source of truth. Add no additional haptic.
8. If the refresh fails or is still running, preserve the current Journey syncing/unavailable message. Never imply that a badge was earned before confirmation.

The existing badge definitions are **First spark**, **Mind reader**, **On a roll**, and **Seven wonders**. Finishing by revealing the answer can unlock finish-count badges; solve-only badges remain governed by the server summary.

## Acceptance criteria

1. A matching complete response that adds a known badge shows that badge once on the matching daily result.
2. A result that adds two known badges names both in the same unlock moment.
3. A badge already in the baseline, an unrelated puzzle result, an account change, incomplete backfill, or offline refresh never produces an unlock moment.
4. If more than one new result appears since the baseline, or any badge-driving summary counter advances by more than the matching result can explain, do not guess which result earned the badge. This also covers older delayed finalizations outside the bounded `recentEntries` window.
5. Restore, account upgrade, and manual refresh do not arm a new unlock check; they may resolve only a still-pending check from an earlier confirmed completion while its result remains active. A daily puzzle rollover discards unresolved checks and unconsumed events for the now-unreachable result.
6. A revealed answer can show a newly confirmed finish badge; no solve-only badge is inferred on the client.
7. The visible status and badge names are exposed to VoiceOver; announcement does not move focus or repeat when the result view is revisited.
8. Reduce Motion preserves the full status without scale or positional movement. Standard and accessibility Dynamic Type layouts do not truncate the names or displace the existing weekly trail and result actions.
9. The feature uses current SwiftUI, `JourneyProgress`, server snapshots, and `Theme`; it adds no package or service dependency.

## Thorbis and Apple source receipts

Consulted 2026-11-03. Thorbis owns the implementation constraints; Apple HIG governs native behavior under D-025.

| Source | Applied guidance |
|---|---|
| [Thorbis DESIGN.md](https://design.thorbis.com/design.md), D-009, D-016, D-023, D-025 | Honest syncing/confirmed states; status is named; role controls prominence; iOS follows Apple HIG. |
| [Thorbis Native contract](https://design.thorbis.com/skills/native), HIG-001–HIG-022 | Native source receipts and verification; system text, accessibility, motion, and truthful server states. Retrieved from the canonical page on 2026-11-03. |
| [Thorbis Platforms](https://design.thorbis.com/platforms) | In a game, the play surface remains the figure and the HUD recedes; iOS retains its tab bar and native stack. |
| [Apple Designing for Games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games/) | Game feedback and touch interactions must remain perceivable and intuitive. |
| [Apple Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | Match feedback strength to the confirmed event; make asynchronous status understandable. |
| [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Keep feedback motion brief and meaningful; provide non-motion alternatives. |
| [Apple Playing Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) | Haptics should be deliberate, consistent, optional, and not overused; this change adds none. |
| [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Use semantic, perceivable status and support system text scaling. |

## HIG applicability matrix

Status at specification time. The implementation and verification columns must be updated before claiming this slice complete.

| Rule | Status | Scope / proof required |
|---|---|---|
| HIG-001 Scope and source receipts | Pass | This spec names app, platform, OS range, surface, rule IDs, source URLs, and consultation date. |
| HIG-002 Platform authority | Pass | Existing native SwiftUI result and Apple navigation remain in place. |
| HIG-003 Native components/materials | Pass | Reuse the existing SwiftUI reward composition and system symbols; no imitation of system chrome. |
| HIG-004 Touch geometry | Not applicable | No new interactive target is added. |
| HIG-005 Navigation | Not applicable | No destination or tab changes. |
| HIG-006 Sheets and dismissal | Not applicable | No transient presentation is added. |
| HIG-007 Safe areas and keyboards | Partial | The result remains in the existing `Page` scroll view and adds no keyboard input. The simulator AX tree exposed the result actions; scrolling to inspect the reward region visually was not completed. |
| HIG-008 System text and Dynamic Type | Partial | On iPhone 17 Pro simulator / iOS 26.3, the result was inspected at Accessibility XXXL and a screenshot was captured. Vertical text grows rather than using a fixed-height reward row; the badge row itself was not scrolled into visual view at this size. |
| HIG-009 Assistive interaction | Partial | Simulator AX output exposes one combined “Badge unlocked” label containing each confirmed badge title and detail. VoiceOver runtime announcement, focus stability, and re-entry behavior were not directly exercised with VoiceOver enabled. |
| HIG-010 Appearance and contrast | Partial | The badge treatment uses existing `Theme.reward`, `Theme.ink`, and `Theme.secondary` colors and includes text plus SF Symbols. The feature row was not visually inspected in both light and dark appearance. |
| HIG-011 Motion and Reduce Motion | Partial | The implementation disables scale/movement and inserts the unlock without an explicit animation when Reduce Motion is enabled. The OS Reduce Motion setting was not toggled during runtime inspection. |
| HIG-012 Haptics | Not applicable | No haptic is added or changed. |
| HIG-013 Input and editing | Not applicable | No input field or editing flow changes. |
| HIG-014 Permissions and privacy | Not applicable | No permission or data-boundary changes. |
| HIG-015 Honest states and offline work | Partial | Simulator fixtures showed one- and two-badge events only after a complete matching Journey response; restored history and an extra hidden older-result counter delta showed no unlock. Offline and incomplete API responses were not exercised. |
| HIG-016 Adaptive iPad | Not tested | Verify the existing result composition at a representative iPad window size. |
| HIG-017 Symbols, language, direction | Partial | Badge names and details reuse the existing `JourneyProgress.Badge` model and SF Symbols. Extended label lengths and right-to-left layout were not exercised. |
| HIG-018 Device performance | Not tested | Record simulator observations separately; representative physical-device performance evidence remains required for release. |
| HIG-019 Media and capture | Not applicable | No media/capture path changes. |
| HIG-020 Shared contracts and adapters | Pass | Reuse `JourneyProgress.Badge`, validated server IDs, `JourneyProgressSnapshot`, and existing theme infrastructure. |
| HIG-021 Evidence | Partial | Simulator build succeeded; one-badge, multi-badge, restored no-replay, and hidden-history ambiguity states were observed through the iOS accessibility tree. `/tmp/rebuzzle-badge-unlock-xxxl.png` records the Accessibility XXXL result screen. These observations do not certify VoiceOver, scrolling reachability, hit areas, or device performance. |
| HIG-022 Review and exceptions | Pass | Independent source review approved the implementation with no Critical, Important, or Minor findings; no exception is proposed. |

## Verification record

- **Build:** `xcodebuild -quiet -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/rebuzzle-badge-unlock-derived CODE_SIGN_IDENTITY=- build` — exit 0, `BUILD SUCCEEDED`.
- **Final verification:** After matching attribution to the server’s exact summary semantics, the same simulator build command exited 0 again; `git diff --check` passed. Independent source review approved with no findings.
- **Simulator:** iPhone 17 Pro, iOS 26.3, simulator label “Rebuzzle Prestige.”
- **One badge:** `--ui-fixture --ui-existing-install`, followed by a correct guess after the preloaded wrong guess; accessibility tree exposed only “Badge unlocked. First spark. Finish your first puzzle.”
- **Two badges:** `--ui-fixture`, followed by a first-guess solve; accessibility tree exposed both “First spark” and “Mind reader.”
- **No historical replay:** `--ui-fixture --ui-late-solve`; restored result contained no `journeyBadgeUnlock` element.
- **Hidden older result:** `--ui-fixture --ui-hidden-history-delta` adds a finish-counter delta with no corresponding recent entry; the current result must show no unlock.
- **Dynamic Type:** Accessibility XXXL was enabled for the simulator; the result hero expanded vertically, and the screenshot path above records that state. The badge row’s visual wrapping at that size was not verified.
- **Tests:** No tests were added or run, per the higher-priority instruction for this task.

## Refusals

- No streak-loss language, countdown pressure, or second simultaneous quest.
- No arbitrary haptic or long celebration animation; the existing completion haptic stays unchanged.
- No copying a competitor’s badge art, names, or visual costume.
- No client-side success state while server progress is incomplete.
