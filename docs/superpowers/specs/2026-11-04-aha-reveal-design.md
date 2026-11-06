# Aha Reveal Design

## Intent

When a daily round ends, let the player see the clue and its answer together. That makes the reveal feel like the puzzle clicked, instead of asking them to remember the board while reading an answer and explanation.

## Scope and audience

- App: Rebuzzle native iOS app, iOS 18+.
- Person: a daily player who just solved the puzzle or used all three guesses.
- Surface: the existing post-game result in the Play tab.
- Profile/pattern: native game result surface; the puzzle and its immediate outcome own the visual focus. The system tab bar and scroll behavior remain native.
- Primary action: understand the clue-to-answer connection, then choose an existing next step such as sharing or viewing Journey.

## Design

- Keep the existing outcome, answer, explanation, guess pattern, XP/stars, Journey progress, sharing, streak, quality pulse, journal path, and next-puzzle reminder.
- In the result panel, place the actual `PuzzleBoard` above the revealed answer. Reuse the same `Puzzle` already used for the daily board; do not recreate clue content or apply a visual transform that could change its meaning.
- As the answer appears, bring the existing stars and XP summary into the same reveal card. This makes the clue, its meaning, and the immediate payoff one game moment. Keep the explanation in the card after the reward, then the confirmed guess/Eve conversation directly after the reveal card.
- Show badge and level-up celebrations in a separate Journey card after Eve’s debrief, and only when backed by server-confirmed Journey progress. Do not add a second success haptic or solve sound; the existing result feedback remains the only immediate solve feedback.
- Follow Eve’s debrief with the existing `DailyReturnCard`, so the next puzzle time and opt-in reminder are easy to find before the remaining share and progress actions.
- Keep the daily ticker under the Play header after game-over as well, with copy that describes the next puzzle rather than implying the solved round is still active. At standard text sizes use a single-line compact pill to preserve room for the reveal; at accessibility sizes retain the full two-line layout. The card below the reward remains the place to configure a reminder or refresh after reset.
- Keep the board readable at standard text sizes and let it take its natural height at accessibility text sizes. Compact only row/stack/grid artwork spacing in the reveal card; preserve free/overlay geometry and canonical image aspect ratio. Do not crop clue-bearing content to force the reward into the first viewport.
- Reduce the oversized result headline enough to make room for the clue-to-answer moment. Keep the answer and explanation visually distinct and readable.
- Remove the redundant collapsed “See the puzzle” disclosure because the board is now visible in the result panel.
- Keep existing XP/stars as the reward; do not add confetti, new score rules, additional puzzles, new permissions, or subscription prompts.
- Keep solved and answer-revealed states distinct. This presentation appears only after the server-confirmed round is over.
- Use existing `Theme` tokens and the existing native SwiftUI scroll surface. Do not introduce a new component kit, color namespace, or animation.

## Non-goals

- Changing puzzle difficulty, answer privacy before game-over, attempts, hints, scoring, XP, streak rules, monetization, API calls, or backend data.
- Making the Plus archive available to free players or adding a second free puzzle.
- Adding motion or haptics. Existing result and reward feedback remains in place.

## Acceptance

- Immediately after a solved round or exhausted round, the original clue board, revealed answer, and explanation appear together in the result panel.
- The postgame flow reads clue → answer → stars/XP → explanation → confirmed guesses with Eve → server-confirmed Journey progress and milestones → next-puzzle countdown/reminder → existing share, streak, feedback, and journal actions.
- The next-reset countdown remains visible at the top of the result screen, while its opt-in reminder and reset refresh stay in the full return card after rewards.
- Active rounds continue to show the same chat thread in the guess area; game-over still removes the answer composer.
- The existing win/reveal distinction, guess pattern, rewards, share action, streak, feedback, reminder, and navigation remain available.
- Long clue content and accessibility text do not clip; the result page remains scrollable and the system tab bar remains usable.
- The hidden answer remains absent while a round is active.

## Source and mobile rule receipt

- Thorbis `D-025`, Native contract `HIG-001` and `HIG-021`: [Native contract](https://design.thorbis.com/skills/native), consulted 2026-11-04.
- Mobbin: [Brilliant lesson-complete screen](https://mobbin.com/screens/f5881118-ee68-4f94-b0fa-c56e9bffb6f0?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), reviewed 2026-11-04 for grouping completion, reward metrics, and a clear next beat. Used as a hierarchy reference, not copied.
- Apple guidance consulted 2026-11-04: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), and [Typography](https://developer.apple.com/design/human-interface-guidelines/typography).
- This is a native SwiftUI change. Apple platform behavior governs the tab bar, scrolling, Dynamic Type, accessibility, and motion; this change adds no custom motion.

| Rule | Applies to this slice | Evidence state |
| --- | --- | --- |
| HIG-001 — scope and source receipts | Yes | Scope and sources recorded above; runtime evidence below |
| HIG-002 — platform authority | Yes | Observed in iOS 26.3 Simulator; native SwiftUI result view and system tab bar retained |
| HIG-003 — native components/materials | Yes | Reuses SwiftUI and existing `PuzzleBoard`; visual board rendered intact in solved and exhausted fixture states |
| HIG-004 — touch geometry | No new controls | Existing controls unchanged |
| HIG-005 — navigation destinations | No navigation changes | Not applicable |
| HIG-006 — sheets and dismissal | No sheet changes | Not applicable |
| HIG-007 — safe areas and keyboards | Result has no active composer | Not applicable to the changed result layout |
| HIG-008 — system text styles/Dynamic Type | Yes | Text scaled and wrapped at accessibility XXXL; simulator scroll gesture did not move the page, so full below-fold readability remains unverified |
| HIG-009 — assistive interaction | Yes | The same labeled `GuessTurnView` is reused for the active thread and postgame debrief; VoiceOver reading order was not runtime-tested |
| HIG-010 — appearance and contrast | Yes | Standard-size solved/exhausted screens observed in dark appearance; exhausted result observed in light appearance; no formal contrast measurement |
| HIG-011 — motion and Reduce Motion | Yes | No motion added; existing `JourneyRewards` checks Reduce Motion in source; runtime Reduce Motion mode not toggled |
| HIG-012 — haptics | No haptic changes | Existing result feedback unchanged |
| HIG-013 — input/editing/recovery | No result input changes | Not applicable |
| HIG-014 — permissions/private information | No permission or privacy changes | Not applicable |
| HIG-015 — honest states/offline work | Yes | Fixture observations show distinct “Aha!”/solved and “The reveal.”/exhausted states; answer appears only after game over |
| HIG-016 — adaptive iPad layout | Yes | iPad verification required before claiming completion |
| HIG-017 — symbols/language/direction | Limited | No new localized controls; inspect longer text layout |
| HIG-018 — measured device performance | Yes | Physical-device performance not yet measured |
| HIG-019 — media/capture | Limited | Existing visual board loaded fully and was not cropped at standard text size; accessibility-size board remains below the viewport pending a successful scroll check |
| HIG-020 — shared contracts/adapters | Yes | Reuses `model.daily?.puzzle`, `PuzzleBoard`, and `Theme` without changing gameplay contracts |
| HIG-021 — evidence before completion | Yes | Debug simulator build succeeded; manual solved/exhausted fixture observations recorded below |
| HIG-022 — review/maintenance/exceptions | Yes | No deviation proposed; review current HIG before release |

## Verification record

- Debug simulator build: `xcodebuild -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /private/tmp/Rebuzzle-result-preview-derived CODE_SIGN_IDENTITY=- build` — `BUILD SUCCEEDED`.
- Release simulator build: `xcodebuild -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -configuration Release -destination 'generic/platform=iOS Simulator' -derivedDataPath /private/tmp/Rebuzzle-result-preview-derived CODE_SIGN_IDENTITY=- build` — `BUILD SUCCEEDED`. XcodeGen was not rerun because this shared project contains extensive pre-existing edits; the build number was synchronized directly in both project.yml and project.pbxproj.
- Manual fixture review on iPhone Simulator (iOS 26.3): solved with `lighthouse` and exhausted with `wrong`, `beacon`, and `house`. Both result states showed the original lightbulb + house board, answer, and explanation together; solved retained its green success marker and exhausted retained three missed-guess markers. Fixture mode intercepted app requests.
- Standard text: board, answer, explanation, and first reward row were visible together in the scrollable result flow. Dark and light appearance were observed; board geometry stayed intact.
- Accessibility XXXL + light appearance: Dynamic Type enlarged and wrapped the headline and result copy. Available simulator scroll gestures did not move the view, so below-fold board readability and scroll behavior at this size are not claimed as verified.
- Release/TestFlight: archive version 1.0.0 build 28 succeeded; Xcode App Store Connect export reported `Upload succeeded` and Apple reported the package processing. Processing completion and Family-group availability are still pending.
- Postgame debrief follow-up (November 4): active and completed rounds now share the same `GuessConversationView`; the solved Debug fixture showed the clue/answer/explanation card, and the `EVE’S DEBRIEF` section follows it in source. XP/Journey now has its own reward card after the conversation. Release and Debug simulator builds succeeded. The exhausted state and below-fold debrief/reward scrolling were not verified because Simulator input did not scroll the page.
- Answer-payoff follow-up (November 4): stars and XP now appear with the revealed answer, before the explanation; the completed Debug fixture’s accessibility order confirms the answer → reward → guess pattern → explanation → Eve debrief sequence. Server-confirmed badges and Journey progress remain in their own card after Eve’s debrief. Debug simulator build succeeded from an isolated source copy. VoiceOver, Reduce Motion, exhausted-state layout, and below-fold scrolling were not runtime-checked in this follow-up.
- Not verified in this pass: VoiceOver, Reduce Motion runtime, iPad, physical-device performance, or below-fold scrolling at Accessibility XXXL. No automated tests were added or run.
