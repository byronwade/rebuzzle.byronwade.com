# Solved puzzle reveal in the Daily result

## Intent

When a player solves the Daily, Rebuzzle already gives an “Aha!” result, Eve’s celebration, and Journey rewards. The result card shows the answer and explanation, but the puzzle board is tucked away in a collapsed disclosure much farther down the page. That separates the aha from the visual clue that made it click.

Keep the exact puzzle directly after its answer and explanation in the result sequence. The player should be able to see the artwork, answer, and explanation together and understand what they solved without hunting for the board.

## Context and design call

- **Audience/device:** Daily puzzle player on iPhone; layout remains adaptive on iPad.
- **Profile/pattern/surface/depth:** Gameplay; terminal-result pattern; existing Daily result card; standard depth.
- **Primary action:** The existing “Find another puzzle” action.
- **Owning skill:** Native SwiftUI UI patterns, with Thorbis Native contract D-025.
- **Call:** Reuse the matching daily puzzle’s existing `PuzzleBoard` as a sibling board surface immediately after the successful result card and before streak/reward cards. Keep its canonical raster/layout untouched. Remove the duplicate bottom disclosure only when that exact puzzle is already shown near the top of the result.

## Goals

- Let a successful player see the puzzle board immediately beside the answer and explanation in the result flow.
- Use only the board belonging to the completed game’s matching puzzle ID and date.
- Reuse `PuzzleBoard`, `CanonicalBoardView`, and current `Theme` typography and colors.
- Preserve the current success celebration and reward sequence without adding a competing animation or haptic.
- Keep the existing collapsed “See the puzzle” affordance for answer-reveal and other non-solve terminal results.
- Keep all result content scrollable and readable at accessibility text sizes.

## Non-goals

- No alteration to canonical board pixels, crop, scale geometry, recoloring, or clue relationships.
- No new sound, haptic, confetti, timer, pressure copy, badge, or reward rule.
- No changes to puzzle difficulty, answer validation, Eve feedback, or the main navigation.
- No board edit, annotation, or zoom gesture.

## Behavior

1. On a successful Daily result, resolve the displayed puzzle only if `game.puzzleId` and `game.puzzleDate` match `model.daily.puzzle.id` and `model.daily.puzzleDate`.
2. Show that puzzle’s existing board immediately after the main result card and before streak/reward cards, with a short visible “The puzzle” heading and the same panel surface used for active gameplay.
3. Preserve the existing result answer, explanation, attempt summary, “Find another puzzle” action, Eve celebration, confetti behavior, streak, sharing, Journey rewards, and round details.
4. Do not show a success reveal for answer-reveal or expiry outcomes. Keep their existing answer and collapsed “See the puzzle” disclosure.
5. If the current Daily no longer matches the completed game, do not show a different day’s puzzle as the solved board.
6. Keep `PuzzleBoard` accessible with its existing “Puzzle: …” label; the heading and artwork remain in normal scroll order. No new motion means Reduce Motion behavior remains unchanged.

## Acceptance criteria

1. A successful result displays the matching canonical puzzle board directly after the answer/explanation card and before streak/reward cards.
2. The board is not duplicated later in the result details.
3. A revealed/expired result keeps the existing collapsed disclosure and receives no solve-only presentation.
4. A mismatched daily puzzle is never presented as the completed puzzle.
5. Canonical artwork keeps its reviewed dimensions, semantics, and accessibility label.
6. At accessibility Dynamic Type sizes the result grows vertically without clipping the board, answer, explanation, or primary action.
7. No extra animation or haptic is introduced; the existing success celebration still runs once under its current rules.

## Source receipts

Consulted 2026-11-03. D-025 makes the live Apple HIG authoritative for native behavior.

| Source | Applied guidance |
|---|---|
| [Thorbis DESIGN.md, D-025](https://design.thorbis.com/design.md#apple-hig-mobile-authority) | Keep the play surface primary, preserve native platform behavior, and record applicable HIG evidence. |
| [Thorbis Native contract](https://design.thorbis.com/skills/native) and [Thorbis UI skill](https://design.thorbis.com/skills/ui) | Reuse the existing native board and result composition; design the exact screen states and accessibility path. |
| [Apple Designing for Games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games/) | Tie the result to the game content that the player just completed. |
| [Apple Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | Keep success feedback close to the relevant puzzle and proportional to the result. |
| [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Add no redundant motion; existing motion remains supplemental to readable result content. |
| [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Preserve the board label and allow the result card to reflow as system text grows. |

## HIG applicability

| Rule | Status | Evidence required |
|---|---|---|
| HIG-008 System text and Dynamic Type | Required | Inspect the solved result at standard and Accessibility XXXL sizes; content grows vertically. |
| HIG-009 Assistive interaction | Required | Inspect the accessibility tree for board description and clear answer/explanation reading order. |
| HIG-011 Motion and Reduce Motion | Required | No new animation; confirm existing celebration remains Reduce Motion-aware. |
| HIG-015 Honest states and recovery | Required | Verify solve-only board presentation is gated by `wasSuccessful` and exact puzzle identity; reveal/expiry remain distinct. |
| HIG-021 Evidence | Required | Record simulator device/OS, build, fixture state, and any unverified physical-device behavior. |
| HIG-022 Review and exceptions | Required | Independent review before merge; no exception proposed. |

## Verification plan

- Build the Rebuzzle iOS Simulator target.
- On the existing Rebuzzle fixture simulator, inspect a correct solve, answer reveal, and mismatched/rolled-over result where available.
- Inspect standard and Accessibility XXXL reading order and board reachability with VoiceOver labels in the accessibility tree.
- Do not claim physical-device performance, runtime VoiceOver interaction, or full release compliance without direct evidence.

## Verification record

- Build: `xcodebuild -quiet -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/rebuzzle-solved-reveal-derived CODE_SIGN_IDENTITY=- build` completed successfully.
- Formatting: `git diff --check` passed.
- Simulator: iPhone 17 Pro, iOS 26.3, dark appearance. On a successful fixture solve, accessibility order placed `Aha!`, the answer, explanation, `Find another puzzle`, then `The puzzle` and its unchanged `PuzzleBoard` label before streak/reward content. The standard-size screenshot showed both the result and board in the same viewport.
- Non-solve result: three incorrect guesses produced the score-lock/reveal path. The result accessibility tree contained the collapsed “See the puzzle” disclosure and no `solvedPuzzleReveal`; expanding the disclosure exposed the correct repeated-`YPPAH` board.
- Accessibility XXXL: the result hero reflowed vertically without clipping in the captured view, and the board remained later in accessibility order. Its full visual presentation after scrolling at XXXL was not confirmed because simulator scrolling did not move the result view.
- Puzzle rollover/mismatch: not reproduced in the simulator. The code requires both puzzle ID and puzzle date to match before revealing the board.
- Automated tests and physical-device behavior were not run or claimed.
