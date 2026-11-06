# Spoiler-safe daily result share card plan

## Goal

Turn the existing text-only daily result invitation into a branded native image share, making Rebuzzle easier to recognize and the same-day challenge easier to pass to a friend. Preserve the broader native game direction in [`native-daily-game-design.md`](../../product/native-daily-game-design.md).

## File map

- `apps/ios/Core/Sources/RebuzzleCore/GameSession.swift`: define a small answer-blind share summary made only from date, completion status, attempt correctness marks, attempt limits, and hint count; derive the existing text share from it.
- `apps/ios/Core/Tests/RebuzzleCoreTests/CoreTests.swift`: verify summary shape and spoiler privacy for solved, revealed, and unfinished sessions.
- `apps/ios/Rebuzzle/Features/DailyResultShareCard.swift` (new): render the 4:5 branded result card and provide an in-memory PNG `Transferable` with a text representation.
- `apps/ios/Rebuzzle/Features/TodayView.swift`: prepare the card after terminal completion and use `ShareLink` with the rendered image; fall back to existing answer-blind text if rendering is unavailable.
- `apps/ios/RebuzzleTests/DailyResultShareCardTests.swift` (new): verify rendered image dimensions/encoding and safe card content as feasible in the hosted iOS unit-test environment.
- `apps/ios/RebuzzleUITests/GameplayUITests.swift`: verify the share invitation is reachable without scrolling and that the native share sheet appears.
- `docs/product/native-daily-game-design.md`: keep the share card within the larger retention, social growth, monetization, and release roadmap.

## Tasks

1. Add core tests for the answer-blind summary: include the visible result pattern and hint count; exclude typed guesses, answer, explanation, private notes, and credentials. Run the focused Core tests and confirm the relevant tests fail before implementation.
2. Implement the summary in `GameSession.swift` and derive the legacy `shareText` from it. Run focused Core tests.
3. Add the custom card using existing theme tokens. Use a 4:5 logical canvas rendered at 3x scale, with brand, daily date, result copy, attempt marks, hint count, and a short invitation/URL. Make solved and revealed copy encouraging and distinct.
4. Add a transferable PNG representation and text fallback; use Apple's `ImageRenderer` and SwiftUI `ShareLink` so the system share sheet remains native.
5. Integrate the card in the completed `ResultView`, prepare the image only for a terminal game, expose accessible labels, and preserve the plain-text share fallback if rendering fails.
6. Add render/privacy coverage, build the iOS target, run focused Core/native/UI validation, inspect the rendered card visually at standard and accessibility text sizes, and update release/verification notes with exact evidence. Do not alter App Store Connect or create a new TestFlight build as part of this source-only slice.

## Acceptance criteria

- The same result can be shared as a polished image and as useful text through native iOS sharing.
- The card shows only approved non-spoiler summary data and the Rebuzzle invitation.
- Existing `GameSession.shareText` consumers remain compatible and spoiler-safe.
- Renderer failure never removes the ability to share the text result.
- Card layout remains legible in light/dark appearance, supports accessibility labels, and needs no new dependency.
- Verification records implementation evidence separately from real retention or revenue outcomes.

## Implementation and verification record

- Implemented the answer-blind `DailyShareSummary`, deriving the existing text share from it.
- Added a 1080 × 1350 branded card with solved/revealed copy, a PNG transferable, and a text proxy; the image uses a fixed light palette in both app appearances.
- Bound the rendered artifact to its source summary, rejected unfinished sessions in the completed-card renderer, and placed ShareLink directly below the completed result so it is reachable without scrolling at standard text size. Accessibility-size text uses a vertical CTA layout and remains reachable.
- The UI test checks the share action and recognizes the native sheet's visible Copy action from its screenshot because the system sheet is not exposed in the app accessibility tree.
- Verification on iPhone 17 Pro / iOS 26.0 simulator: `swift test --package-path apps/ios/Core` passed 49 tests; all three `DailyResultShareCardTests` passed; both focused share UI tests passed; `git diff --check` passed after implementation.
- Read-only review found no Critical or Important implementation issues. The suggested same-outcome stale-artifact comparison was added and the three renderer tests passed again.
- The full release and TestFlight checklist remains separate. This source change has not been uploaded to App Store Connect, and the evidence does not establish retention or revenue impact.
