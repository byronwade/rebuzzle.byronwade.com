# iOS Game Hub Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Play tab root with a game hub (`HomeView`): a date and streak header, a "Today's puzzle" card whose status follows the daily state, and a "More ways to play" grid (Rush and Endless disabled with "Coming soon", Archive live). The existing daily screen moves behind a pushed `RebuzzleRoute.daily`. This is PR 1 of spec `docs/superpowers/specs/2026-10-31-ios-game-hub-and-modes-design.md`, iOS only, with no server changes.

**Architecture:**
- `TodayCardStatus` lives in `RebuzzleCore` and is unit-tested with Swift Testing. It is a pure enum derived from `GameSession?`, the hint count and the hints shown, and it produces the status line, the CTA title and the countdown text.
- `HomeView.swift` in the app target holds `HomeView`, `TodayPuzzleCard` and `ModeCard`. They read the shared `AppModel` and navigate with `NavigationLink(value: RebuzzleRoute.daily / .archive)` on the Play `NavigationStack(path: $playPath)`.
- `RootView` changes in four ways:
  - It swaps `TodayView()` for `HomeView()` as the Play root.
  - It routes `.daily` to `TodayView()`.
  - Its `ReturnRouter` handler resets `playPath` to `[.daily]`.
  - It gains the DEBUG `--preview-screen home|daily` cases.
- UI tests reach the daily through a shared `openTodaysPuzzle(_:until:)` helper.

**Tech Stack:**
- Swift 6 and SwiftUI on iOS 18+, with the Observation `AppModel`.
- A RebuzzleCore SwiftPM package, tested with Swift Testing (`swift test --package-path Core`).
- XCTest UI tests against the DEBUG `--ui-fixture` transport.
- An XcodeGen-generated `Rebuzzle.xcodeproj`. The `project.pbxproj` is tracked in git, so it must be regenerated and committed when files are added.

---

## Conventions for every task

- Work in `/Users/byronwade/ios-work/rebuzzle-hub` on branch `feat/ios-game-hub`. Every command below starts with `cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios`.
- **Simulator.** Use `${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}`. The fallback id is the "Rebuzzle Prestige" simulator, which is currently Shutdown. `xcodebuild test` boots it automatically.
- **Derived data.** Use `/tmp/rebuzzle-hub-build/DerivedData`. The README requires `/tmp` to avoid code-signing failures caused by Documents extended attributes. Always pass `CODE_SIGN_IDENTITY=-`, and never `CODE_SIGNING_ALLOWED=NO`, because the guest identity uses Keychain.
- **New files.** `project.yml` globs `sources: [Rebuzzle]` and `- path: RebuzzleUITests`, so new Swift files are picked up. However, `Rebuzzle.xcodeproj/project.pbxproj` is tracked and lists files explicitly. Any task that adds a file under `Rebuzzle/` or `RebuzzleUITests/` must run `xcodegen generate` and commit `Rebuzzle.xcodeproj/project.pbxproj`.
- **Core files.** Files under `Core/` are picked up by SwiftPM automatically and need no regeneration.
- **CI.** CI (`.github/workflows/ios.yml`) runs:
  1. `xcodegen generate`
  2. `swift test --package-path Core`
  3. a generic simulator build
  4. the full `xcodebuild test` with `-test-timeouts-enabled YES -default-test-execution-time-allowance 300`

  The commands below mirror these steps.
- Commit messages end with a blank line and then the co-author trailer. Use two `-m` flags as shown.

**UI test command template.** Each task substitutes its own `-only-testing:` list:

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/HomeHubUITests
```

## Decisions taken where the spec is silent

1. **Hub title.** The hub sets `.navigationTitle("Play")` and hides its navigation bar with `.toolbar(.hidden, for: .navigationBar)`. The header row replaces the bar, and the daily's back button reads "Play".
   - The hub deliberately does not use the title "Rebuzzle". Old `navigationBars["Rebuzzle"]` assertions must fail loudly instead of silently matching the hub.
2. **Daily title.** The daily screen's inline title becomes "Today", as the spec says.
3. **Launch race with the player reset.** At launch, `AppModel.load()` sets `daily` before `authenticate()` sets `player`. The existing `RootView.onChange(of: model.player?.id)` then empties every path, including the first nil-to-guest assignment. Any `.daily` push made before that point would bounce back to the hub, whether it came from a card tap, a ReturnRouter request or the Archive card.
   - **Root fix (Task 3).** The reset now runs only on a real account change: `guard old != nil`. Sign-out and identity changes still reset.
   - **Pending requests (Task 3).** The ReturnRouter handler uses `.onChange(of:initial: true)`, so a request that is already pending when `RootView` appears (a notification tap on cold launch) is still handled.
   - **Belt and braces.** The card is also tappable only once `model.game != nil || !model.busy`. While it is locked, its CTA shows a spinner, and `openTodaysPuzzle` waits for `isEnabled`.
4. **States the spec does not list.**
   - Score-locked continuation (`scoreLocked == true`, not game over, `attemptsLeft == 0`) reads "Score saved · keep solving" with "Keep going". It never reads "0 guesses left".
   - A nudge used before any guess counts as in progress.
5. **Countdown wording.**
   - With an hour or more left it shows whole hours, e.g. "new puzzle in 5h", which matches `DailyReturnCard`'s `seconds / 3600`.
   - Under an hour it shows rounded-up minutes, e.g. "new puzzle in 45m".
   - When the time is due or unknown it shows "new puzzle soon".
   - The source is `DailyReturnTiming.deadline(daily.nextPuzzleTime)` with `DailyReturnTiming.remaining(until:now:)`. It refreshes through `TimelineView(.periodic(from: .now, by: 60))`.
6. **Nudge count.** "3 guesses · 3 nudges" is computed: `game.maxAttempts` (3 with no session) and `daily.puzzle.hints.count`. With no hints (`--ui-no-hints`) the line is "3 guesses".
7. **Streak value.** The streak comes from `DailyStreakPresentation.journey(stats: model.stats).current`, the same source the Journey tab uses. The chip is hidden when that is nil or 0.
8. **Copy.** The CTA copy uses the app's typographic apostrophe ("Play today’s"), matching existing strings such as "Finding today’s puzzle…".
9. **Daily header.** In `TodayView`, "Make it click." and `EveAvatar` are removed. The small "Daily puzzle · Fri, Oct 31" line is kept, because it carries `.id("dailyHeader")`, the scroll anchor used after a finish.
10. **Quick start.** The first-session quick-start sheet is attached to `TodayView`, so it now appears when the daily is first opened instead of at launch. This is intended and needs no code change.
11. **Identity change.** An identity change empties `playPath`. Only `ReturnRouter` requests push `.daily`, so `testIdentityChangeReturnsToTodayFromPushedJournal` now lands on the hub. It is renamed `testIdentityChangeReturnsToTheHubFromPushedJournal`.
12. **Unavailable daily.** In the failed state, the hub reuses TodayView's exact unavailable notice: `ContentUnavailableView("A puzzle worth waiting for", …)` plus "Try again". "How to play" stays on the daily screen only, so `testFirstSessionQuickStartWaitsForDailyAvailability` drops that one assertion.

## File structure

| File | Action | Responsibility |
| --- | --- | --- |
| `apps/ios/Core/Sources/RebuzzleCore/TodayCardStatus.swift` | Create | Pure enum. Maps `GameSession?` plus the hint count and hints shown to not started, in progress, continuing, solved or revealed. Provides `statusLine(nextPuzzle:now:)`, `buttonTitle`, `isFinished` and `countdown(until:now:)`. |
| `apps/ios/Core/Tests/RebuzzleCoreTests/TodayCardStatusTests.swift` | Create | Swift Testing suite for every state, the pluralisation, the no-hints wording and the countdown edges. |
| `apps/ios/Rebuzzle/Features/HomeView.swift` | Create | `HomeView` (header row, card, mode grid, refresh), `TodayPuzzleCard` (status-driven card with links to `.daily`) and `ModeCard` (mode tile label). |
| `apps/ios/Rebuzzle/App/RebuzzleApp.swift` | Modify | Adds `RebuzzleRoute.daily` and its destination, makes `HomeView` the Play root, pushes `.daily` on ReturnRouter requests, and adds the `--preview-screen home` and `daily` cases. |
| `apps/ios/Rebuzzle/Features/TodayView.swift` | Modify | Removes the masthead ("Make it click." and `EveAvatar`), keeps the anchored date line, and sets the inline title to "Today". |
| `apps/ios/RebuzzleUITests/UITestSupport.swift` | Create | Shared `openTodaysPuzzle(_:until:)`, which waits for `homeTodayCard` to be enabled, taps it, and waits for the answer field or a supplied landmark. |
| `apps/ios/RebuzzleUITests/HomeHubUITests.swift` | Create | Hub tests: root, open and back; a play link during launch landing on the daily; solved fixture showing "Solved in"; solve then back showing Solved; mode cards; accessibility size. |
| `apps/ios/RebuzzleUITests/GameplayUITests.swift` | Modify | `launchFixture` routes through the hub, plus targeted updates to tests that relaunch, check navigation-bar titles, or depend on the old root. |
| `apps/ios/RebuzzleUITests/DailySolvePulseUITests.swift` | Modify | `launchFixture` routes through the hub. |
| `apps/ios/Rebuzzle.xcodeproj/project.pbxproj` | Regenerate | Picks up the three new app and UI-test files. |

### Every UI test that assumed the daily answer field at launch

All of these call `launchFixture`, which now calls `openTodaysPuzzle(app)` (or `openTodaysPuzzle(app, until:)` for fixtures without an answer field). Their bodies are unchanged except where the rightmost column says otherwise.

**`GameplayUITests.swift`:**

| Test | Change beyond `launchFixture` |
| --- | --- |
| `testCanonicalBoardUsesReviewedImageEvenInUnicodeMode` | — |
| `testInvalidCanonicalBoardNeverFallsBackToLegacyClue` | — |
| `testStudyPuzzlePreservesDraftAndGuesses` | — |
| `testDailyThoughtCanBeSavedAndReopenedWithoutChangingTheGuess` | — |
| `testDailyThoughtEditorSupportsAccessibilityTextAndKeyboardDismissal` | — |
| `testDailyThoughtSheetClosesAndClearsAtPuzzleExpiry` | — |
| `testDismissKeyboardPreservesUnsubmittedAnswer` | — |
| `testAccessibleKeyboardDismissalPreservesUnsubmittedAnswer` | — |
| `testFirstSessionQuickStartExplainsPuzzleAndPersistsAfterRelaunch` | **Edited:** its manual relaunch now calls `openTodaysPuzzle(app)`. |
| `testExistingInstallWithPriorProgressSkipsQuickStartWithoutPreference` | — |
| `testFirstSessionQuickStartWorksAtAccessibilitySize` | — |
| `testFirstSessionQuickStartWaitsForDailyAvailability` | **Edited:** the "How to play" assertion is removed and the hub-state assertions are added. |
| `testEveNudgesBecomeConversationTurnsAndRemainAnswerBlind` | — |
| `testNudgeActionIsHiddenWhenThereAreNoHints` | — |
| `testNudgeActionDisappearsAfterTheLastAuthoredHint` | — |
| `testNudgeRemainsAvailableDuringScoreLockedContinuation` | Uses the `--ui-score-locked` landmark. |
| `testNudgeControlStaysTappableAtAccessibilitySizeAfterKeyboardDismissal` | — |
| `testKeyboardCheckWaitsForProgressRefreshAfterUnconfirmedSubmission` | — |
| `testWrongGuessThenWin` | **Edited:** `navigationBars["Rebuzzle"]` becomes `"Today"`. |
| `testScoreLockedDailyOffersContinueWithoutRevealingAnswer` | Uses the `--ui-score-locked` landmark. |
| `testLateSolveResultExplainsContinuationCount` | Uses the `--ui-late-solve` landmark. |
| `testExpiredAnswerReviewNeverBlocksTodaysPuzzle` | — |
| `testDailyResultShareOpensFromTheInitialResultViewport` | — |
| `testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling` | — |
| `testExpiredResultCanRefreshIntoTheNewDailyPuzzle` | Uses the `--ui-expired-reset-manual` landmark. |
| `testShareLinkReturnsToTodayFromPushedJournal` | **Edited:** `"Rebuzzle"` becomes `"Today"`. |
| `testIdentityChangeReturnsToTodayFromPushedJournal` | **Edited and renamed** `testIdentityChangeReturnsToTheHubFromPushedJournal`: asserts `homeTodayCard`. |
| `testDailyResultShareRemainsAccessibleAtAccessibilityTextSize` | — |
| `testCountdownAndReminderDiscovery` | — |
| `testAccessibleCountdownAndReminders` | — |
| `testRealPurchaseDeliversJournalNotesInsightsAndRestoresAfterRelaunch` | — (its relaunch already uses `launchFixture`) |
| `testAccessibleStudyWithoutSavedHintsStillOffersAnswerReveal` | — |
| `testPlusShowsMyCompletedPuzzleBeforePurchase` | — |
| `testThreeWrongGuessesLockScoreWithoutRevealingAnswer` | — |
| `testQualityFeedbackIsOptionalAfterSolve` | — |
| `testQualityFeedbackWorksAfterRevealAtAccessibilitySize` | — |
| `testAccessibleTextGameplay` | **Edited:** `navigationBars["Rebuzzle"]` becomes `"Today"`. |
| `testConversationSurvivesCompletion` | — |
| `testEveUnavailableDoesNotInterruptGame` | — |
| `testFailedEveReplyCanBeRetriedWithoutSubmittingAnotherGuess` | — |
| `testRewardJourneyNavigationPreservesCompletedGame` | — (the Play stack keeps `.daily` across tab switches) |
| `testWeeklyTrailPreviewAndEarnedBonusUpdateAfterTodaysPuzzle` | — |
| `testTabNavigation` | — (returning to Play still shows the pushed daily) |
| `testPlusArchivePracticeIsUnscoredHintedAndAnswerBlindUntilSolvedOrRevealed` | — (it ends on Play and expects "3 guesses remaining" on the still-pushed daily) |

Some tests never touch the daily, yet still pass through `launchFixture`, which now opens the daily harmlessly. Their bodies are unchanged:
- `testAchievementsOpenFromJourneyWithTierDetail`
- `testFreeArchiveSampleIsAvailableWhileTheFullArchiveStaysLocked`
- `testFreeArchiveSampleOffersPlusOnlyAfterTheRoundEnds`
- `testPracticeEveFailureCanBeRetriedWithoutSubmittingAnotherGuess`
- `testPracticeEveFailureRemainsRetryableAfterSolving`
- `testPlusBenefitsAreExplainedBeforePurchasePrompt`

**`DailySolvePulseUITests.swift`.** All four tests go through its `launchFixture`, and their bodies are unchanged:
- `testCollapsedCardDoesNotFetchUntilExpanded`
- `testLateSolveHighlightsFourPlusBucket` (uses the late-solve landmark)
- `testSmallSampleExplainsWhyMixIsUnavailable`
- `testFailedLoadCanRetryWithoutLeavingResult`

---

## Task 1: `TodayCardStatus` in RebuzzleCore (TDD)

**Files:**
- Create: `apps/ios/Core/Tests/RebuzzleCoreTests/TodayCardStatusTests.swift`
- Create: `apps/ios/Core/Sources/RebuzzleCore/TodayCardStatus.swift`

- [ ] **Step 1: Write the failing tests.** Create `apps/ios/Core/Tests/RebuzzleCoreTests/TodayCardStatusTests.swift`:

```swift
import Foundation
import Testing
@testable import RebuzzleCore

@Suite struct TodayCardStatusTests {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    private func session(_ results: [Bool], attemptsLeft: Int? = nil) -> GameSession {
        var game = GameSession(puzzleId: "daily", puzzleDate: "2026-11-01")
        game.attempts = results.enumerated().map { index, correct in
            Guess(guess: "guess \(index + 1)", correct: correct, attemptNumber: index + 1)
        }
        game.attemptsLeft = attemptsLeft ?? max(0, 3 - results.count)
        return game
    }

    @Test func anUntouchedDailyInvitesTheFirstGuess() {
        let status = TodayCardStatus(game: session([]), hintCount: 3, hintsShown: 0)

        #expect(status == .notStarted(guesses: 3, nudges: 3))
        #expect(status.statusLine(nextPuzzle: nil, now: now) == "3 guesses · 3 nudges")
        #expect(status.buttonTitle == "Play today’s")
        #expect(!status.isFinished)
    }

    @Test func aMissingSessionStillReadsAsNotStarted() {
        let status = TodayCardStatus(game: nil, hintCount: 2, hintsShown: 0)

        #expect(status == .notStarted(guesses: 3, nudges: 2))
        #expect(status.statusLine(nextPuzzle: nil, now: now) == "3 guesses · 2 nudges")
    }

    @Test func aPuzzleWithoutHintsOnlyCountsGuesses() {
        let status = TodayCardStatus(game: session([]), hintCount: 0, hintsShown: 0)

        #expect(status.statusLine(nextPuzzle: nil, now: now) == "3 guesses")
    }

    @Test func aWrongGuessCountsDownTheGuessesLeft() {
        let two = TodayCardStatus(game: session([false]), hintCount: 3, hintsShown: 0)
        let one = TodayCardStatus(game: session([false, false]), hintCount: 3, hintsShown: 0)

        #expect(two == .inProgress(guessesLeft: 2))
        #expect(two.statusLine(nextPuzzle: nil, now: now) == "2 guesses left")
        #expect(two.buttonTitle == "Keep going")
        #expect(one.statusLine(nextPuzzle: nil, now: now) == "1 guess left")
    }

    @Test func aNudgeBeforeAnyGuessCountsAsStarted() {
        let status = TodayCardStatus(game: session([]), hintCount: 3, hintsShown: 1)

        #expect(status == .inProgress(guessesLeft: 3))
        #expect(status.buttonTitle == "Keep going")
    }

    @Test func aScoreLockedContinuationNeverShowsZeroGuessesLeft() {
        var game = session([false, false, false], attemptsLeft: 0)
        game.scoreLocked = true
        game.phase = "score_locked"
        let status = TodayCardStatus(game: game, hintCount: 3, hintsShown: 0)

        #expect(status == .continuing)
        #expect(status.statusLine(nextPuzzle: nil, now: now) == "Score saved · keep solving")
        #expect(status.buttonTitle == "Keep going")
        #expect(!status.isFinished)
    }

    @Test func aSolveReportsTheWinningGuessAndTheNextPuzzle() {
        var game = session([false, true], attemptsLeft: 1)
        game.gameOver = true
        game.wasSuccessful = true
        let status = TodayCardStatus(game: game, hintCount: 3, hintsShown: 0)

        #expect(status == .solved(guesses: 2))
        #expect(status.statusLine(nextPuzzle: now.addingTimeInterval(5 * 3600 + 600), now: now) == "Solved in 2 · new puzzle in 5h")
        #expect(status.buttonTitle == "See result")
        #expect(status.isFinished)
    }

    @Test func aLateSolveCountsEveryGuessUpToTheWinningOne() {
        var game = session([false, false, false, true], attemptsLeft: 0)
        game.gameOver = true
        game.wasSuccessful = true
        game.scoreLocked = true

        #expect(TodayCardStatus(game: game, hintCount: 3, hintsShown: 0) == .solved(guesses: 4))
    }

    @Test func runningOutOfGuessesRevealsTheAnswer() {
        var game = session([false, false, false], attemptsLeft: 0)
        game.gameOver = true
        game.wasSuccessful = false
        let status = TodayCardStatus(game: game, hintCount: 3, hintsShown: 0)

        #expect(status == .revealed)
        #expect(status.statusLine(nextPuzzle: now.addingTimeInterval(44 * 60 + 30), now: now) == "Answer revealed · new puzzle in 45m")
        #expect(status.buttonTitle == "See result")
        #expect(status.isFinished)
    }

    @Test func theCountdownNeverReadsZeroHours() {
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(3600), now: now) == "new puzzle in 1h")
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(3599), now: now) == "new puzzle in 60m")
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(30), now: now) == "new puzzle in 1m")
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(-1), now: now) == "new puzzle soon")
        #expect(TodayCardStatus.countdown(until: nil, now: now) == "new puzzle soon")
    }
}
```

- [ ] **Step 2: Run the tests and confirm they fail.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && swift test --package-path Core --filter TodayCardStatusTests
```

Expected: the build fails with `cannot find 'TodayCardStatus' in scope`.

- [ ] **Step 3: Implement the minimal type.** Create `apps/ios/Core/Sources/RebuzzleCore/TodayCardStatus.swift`:

```swift
import Foundation

/// What the Play hub's today card says about the daily, derived from the restored session.
public enum TodayCardStatus: Equatable, Sendable {
    case notStarted(guesses: Int, nudges: Int)
    case inProgress(guessesLeft: Int)
    /// The three scored guesses are spent; the player is still solving for the streak.
    case continuing
    case solved(guesses: Int)
    case revealed

    public init(game: GameSession?, hintCount: Int, hintsShown: Int) {
        let nudges = max(0, hintCount)
        guard let game else {
            self = .notStarted(guesses: 3, nudges: nudges)
            return
        }
        if game.gameOver {
            self = game.wasSuccessful == true
                ? .solved(guesses: game.attempts.first(where: \.correct)?.attemptNumber ?? game.attempts.count)
                : .revealed
        } else if game.scoreLocked == true || game.attemptsLeft == 0 {
            self = .continuing
        } else if game.attempts.isEmpty && hintsShown == 0 {
            self = .notStarted(guesses: game.maxAttempts, nudges: nudges)
        } else {
            self = .inProgress(guessesLeft: game.attemptsLeft)
        }
    }

    public var isFinished: Bool {
        switch self {
        case .solved, .revealed: return true
        case .notStarted, .inProgress, .continuing: return false
        }
    }

    public var buttonTitle: String {
        switch self {
        case .notStarted: return "Play today’s"
        case .inProgress, .continuing: return "Keep going"
        case .solved, .revealed: return "See result"
        }
    }

    public func statusLine(nextPuzzle: Date?, now: Date = Date()) -> String {
        switch self {
        case let .notStarted(guesses, nudges):
            let guessText = Self.count(guesses, "guess", "guesses")
            return nudges > 0 ? "\(guessText) · \(Self.count(nudges, "nudge", "nudges"))" : guessText
        case let .inProgress(guessesLeft):
            return "\(Self.count(guessesLeft, "guess", "guesses")) left"
        case .continuing:
            return "Score saved · keep solving"
        case let .solved(guesses):
            return "Solved in \(guesses) · \(Self.countdown(until: nextPuzzle, now: now))"
        case .revealed:
            return "Answer revealed · \(Self.countdown(until: nextPuzzle, now: now))"
        }
    }

    /// Whole hours while an hour or more remains, then rounded-up minutes, so it never reads "0h".
    public static func countdown(until deadline: Date?, now: Date = Date()) -> String {
        guard let deadline else { return "new puzzle soon" }
        let seconds = DailyReturnTiming.remaining(until: deadline, now: now)
        guard seconds > 0 else { return "new puzzle soon" }
        if seconds >= 3600 { return "new puzzle in \(seconds / 3600)h" }
        return "new puzzle in \((seconds + 59) / 60)m"
    }

    private static func count(_ value: Int, _ singular: String, _ plural: String) -> String {
        "\(value) \(value == 1 ? singular : plural)"
    }
}
```

- [ ] **Step 4: Run the tests and confirm they pass.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && swift test --package-path Core --filter TodayCardStatusTests
```

Expected: the summary line contains `10 tests` and `passed`, for example `Test run with 10 tests in 1 suite passed after … seconds.`

Then run the whole Core suite:

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && swift test --package-path Core
```

Expected: every test passes, with no failures in the existing suites.

- [ ] **Step 5: Commit.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && git add Core/Sources/RebuzzleCore/TodayCardStatus.swift Core/Tests/RebuzzleCoreTests/TodayCardStatusTests.swift && git commit -m "feat(ios): derive the hub's today card status in core" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: `.daily` route and the hub views (built, not yet the root)

**Files:**
- Create: `apps/ios/Rebuzzle/Features/HomeView.swift`
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift` (`RebuzzleRoute`, `destination(for:)`)
- Regenerate: `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`

- [ ] **Step 1: Add the route.** In `apps/ios/Rebuzzle/App/RebuzzleApp.swift`, replace:

```swift
enum RebuzzleRoute: Hashable {
    case journal
```

with:

```swift
enum RebuzzleRoute: Hashable {
    /// Today's puzzle, pushed from the Play hub.
    case daily
    case journal
```

- [ ] **Step 2: Route `.daily` to the existing daily screen.** In the same file, in `destination(for:)`, replace:

```swift
        switch route {
        case .journal:
            JournalView()
```

with:

```swift
        switch route {
        case .daily:
            TodayView()
        case .journal:
            JournalView()
```

- [ ] **Step 3: Create the hub views.** Create `apps/ios/Rebuzzle/Features/HomeView.swift`:

```swift
import SwiftUI
import RebuzzleCore

/// Play tab root: today's puzzle up top, other ways to play below.
struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        Page(spacing: 22, bottomSafeAreaClearance: 72) {
            header
            TodayPuzzleCard()
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: "MORE WAYS TO PLAY")
                LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
                    Button {} label: {
                        ModeCard(symbol: "bolt.fill", title: "Rush", line: "3 minutes. Solve as many as you can.", footer: "Coming soon", available: false)
                    }
                    .buttonStyle(.plain)
                    .disabled(true)
                    .accessibilityLabel("Rush. 3 minutes. Solve as many as you can. Coming soon")
                    .accessibilityIdentifier("homeModeRush")
                    Button {} label: {
                        ModeCard(symbol: "infinity", title: "Endless", line: "One miss ends the run.", footer: "Coming soon", available: false)
                    }
                    .buttonStyle(.plain)
                    .disabled(true)
                    .accessibilityLabel("Endless. One miss ends the run. Coming soon")
                    .accessibilityIdentifier("homeModeEndless")
                    NavigationLink(value: RebuzzleRoute.archive) {
                        ModeCard(symbol: "calendar", title: "Archive", line: "Replay any past puzzle.")
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Archive. Replay any past puzzle.")
                    .accessibilityIdentifier("homeModeArchive")
                }
            }
        }
        // The header row replaces the bar; the title still names the back button on pushed screens.
        .navigationTitle("Play")
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await model.load() }
    }

    private var columns: [GridItem] {
        typeSize.isAccessibilitySize
            ? [GridItem(.flexible())]
            : [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            Text(Self.dateLabel(model.daily?.puzzleDate))
                .font(Theme.display(24)).tracking(-0.5)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("homeDate")
            Spacer(minLength: 8)
            if let streak = DailyStreakPresentation.journey(stats: model.stats).current, streak > 0 {
                Label("\(streak)", systemImage: "flame.fill")
                    .font(Theme.font(14, weight: .semibold)).monospacedDigit()
                    .foregroundStyle(Theme.reward)
                    .padding(.horizontal, 10).frame(minHeight: 32)
                    .background(Theme.reward.opacity(0.12), in: Capsule())
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(streak) day streak")
                    .accessibilityIdentifier("homeStreakChip")
            }
            EveAvatar(celebrating: model.game?.wasSuccessful == true)
                .accessibilityLabel("Eve, your AI puzzle author")
        }
    }

    /// "Friday, Oct 31", from the daily's own date so it matches the puzzle, not the device clock.
    static func dateLabel(_ puzzleDate: String?) -> String {
        let format = Date.FormatStyle.dateTime.weekday(.wide).month(.abbreviated).day()
        guard let puzzleDate else { return Date().formatted(format) }
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let parsed = parser.date(from: puzzleDate) else { return puzzleDate }
        return parsed.formatted(format)
    }
}

/// Today's daily at a glance. The card body and its button both push the daily screen.
struct TodayPuzzleCard: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let daily = model.daily {
                // Opening before the session restores would race the account reset that empties the Play path.
                let canOpen = model.game != nil || !model.busy
                TimelineView(.periodic(from: .now, by: 60)) { context in
                    let status = TodayCardStatus(game: model.game, hintCount: daily.puzzle.hints.count, hintsShown: model.hintsShown)
                    let line = status.statusLine(nextPuzzle: DailyReturnTiming.deadline(daily.nextPuzzleTime), now: context.date)
                    VStack(alignment: .leading, spacing: 14) {
                        NavigationLink(value: RebuzzleRoute.daily) {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(alignment: .firstTextBaseline, spacing: 8) {
                                    Eyebrow(text: "TODAY · " + daily.puzzle.typeName.uppercased())
                                    Spacer(minLength: 4)
                                    DifficultyBadge(difficulty: daily.puzzle.difficulty)
                                }
                                // A glance, not the playable board: same clue drawing, shrunk and inert.
                                PuzzleBoard(puzzle: daily.puzzle)
                                    .allowsHitTesting(false)
                                    .scaleEffect(0.6)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 120)
                                    .clipped()
                                    .accessibilityHidden(true)
                                Text(line)
                                    .font(Theme.font(14, weight: .medium))
                                    .foregroundStyle(status.isFinished ? Theme.reward : Theme.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Today’s puzzle, \(daily.puzzle.typeName). \(DifficultyTier.accessibilityLabel(difficulty: daily.puzzle.difficulty)). \(line)")
                        .accessibilityHint(status.buttonTitle)
                        .accessibilityIdentifier("homeTodayCard")
                        NavigationLink(value: RebuzzleRoute.daily) {
                            HStack {
                                Text(status.buttonTitle)
                                if canOpen { Image(systemName: "arrow.right") } else { ProgressView().tint(Theme.canvas) }
                            }
                        }
                        .buttonStyle(CommitStyle())
                        .accessibilityLabel(status.buttonTitle)
                        .accessibilityIdentifier("homeTodayPlay")
                    }
                    .disabled(!canOpen)
                }
            } else if model.busy {
                VStack(spacing: 16) { ProgressView(); Text("Finding today’s puzzle…").font(Theme.font(15)) }
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else {
                ContentUnavailableView("A puzzle worth waiting for", systemImage: "wifi.slash", description: Text(model.error ?? "Connect to load today’s puzzle."))
                Button("Try again") { Task { await model.load() } }.buttonStyle(CommitStyle())
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink.opacity(0.14), lineWidth: 1))
    }
}

/// A way to play beyond the daily. The caller wraps it in the tap target and sets the combined label.
struct ModeCard: View {
    let symbol: String
    let title: String
    let line: String
    var footer: String?
    var available = true
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(available ? Theme.accent : Theme.secondary)
                .frame(width: 36, height: 36)
                .background((available ? Theme.accent : Theme.secondary).opacity(0.10), in: RoundedRectangle(cornerRadius: 10))
            Text(title)
                .font(Theme.font(16, weight: .semibold))
                .foregroundStyle(available ? Theme.ink : Theme.secondary)
            Text(line)
                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            if let footer {
                Text(footer)
                    .font(Theme.font(11, weight: .semibold, relativeTo: .caption))
                    .foregroundStyle(Theme.reward)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink.opacity(0.12), lineWidth: 1))
        .contentShape(RoundedRectangle(cornerRadius: 14))
    }
}
```

- [ ] **Step 4: Regenerate the project and confirm the file is listed.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodegen generate && grep -c "HomeView.swift" Rebuzzle.xcodeproj/project.pbxproj
```

Expected: `Created project at …/Rebuzzle.xcodeproj`, then `4`. The four entries are the build file, the file reference, the group child and the Sources phase.

- [ ] **Step 5: Build.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData CODE_SIGN_IDENTITY=- build
```

Expected: `** BUILD SUCCEEDED **`. `HomeView` is not referenced yet, and the Play root is still `TodayView`.

- [ ] **Step 6: Commit.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && git add Rebuzzle/Features/HomeView.swift Rebuzzle/App/RebuzzleApp.swift Rebuzzle.xcodeproj/project.pbxproj && git commit -m "feat(ios): add the Play hub views and a daily route" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Make the hub the Play root, push `.daily` on return requests, and route UI tests through the hub

This task changes the root and every UI-test entry point together, so no commit leaves the suite red.

**Files:**
- Create: `apps/ios/RebuzzleUITests/UITestSupport.swift`
- Create: `apps/ios/RebuzzleUITests/HomeHubUITests.swift`
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift` (Play root, ReturnRouter handler)
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`
- Modify: `apps/ios/RebuzzleUITests/DailySolvePulseUITests.swift`
- Regenerate: `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`

- [ ] **Step 1: Add the shared UI-test helper.** Create `apps/ios/RebuzzleUITests/UITestSupport.swift`:

```swift
import XCTest

/// The Play tab opens on the game hub. Daily tests step into today's puzzle through its card,
/// then wait for a landmark on the daily screen: the answer field unless the fixture has none.
@MainActor func openTodaysPuzzle(
    _ app: XCUIApplication,
    until landmark: XCUIElement? = nil,
    file: StaticString = #filePath,
    line: UInt = #line
) {
    let card = app.buttons["homeTodayCard"]
    XCTAssertTrue(card.waitForExistence(timeout: 15), "The Play hub should show today's card", file: file, line: line)
    // The card unlocks once the session restores, after the launch-time account reset of the Play path.
    let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isEnabled == true"), object: card)
    XCTAssertEqual(XCTWaiter.wait(for: [enabled], timeout: 15), .completed, "Wait for today's session before opening it", file: file, line: line)
    card.tap()
    let target = landmark ?? app.descendants(matching: .any)["answerField"].firstMatch
    XCTAssertTrue(target.waitForExistence(timeout: 15), "Today's puzzle should open from the hub", file: file, line: line)
}
```

- [ ] **Step 2: Write the failing hub test.** Create `apps/ios/RebuzzleUITests/HomeHubUITests.swift`:

```swift
import XCTest

@MainActor final class HomeHubUITests: XCTestCase {
    private var app: XCUIApplication!

    override func tearDown() async throws {
        app?.terminate()
    }

    private func launch(_ extraArguments: [String] = []) {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-fixture", "--ui-returning-player", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + extraArguments
        app.launch()
    }

    private func waitForLabel(_ element: XCUIElement, containing text: String, timeout: TimeInterval = 15) {
        expectation(for: NSPredicate(format: "label CONTAINS %@", text), evaluatedWith: element)
        waitForExpectations(timeout: timeout)
    }

    /// A play link that arrives while the launch load is still signing in must not be undone by it.
    func testPlayLinkDuringLaunchLandsOnTodaysPuzzleAndStays() {
        launch()
        app.open(URL(string: "rebuzzle://play")!)
        // The system may ask to confirm opening the app's own scheme; accept it if it does.
        let confirm = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Open"]
        if confirm.waitForExistence(timeout: 2) { confirm.tap() }

        let field = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 15), "A play link should land on today's puzzle, not the hub")
        XCTAssertTrue(waitForEnabledCheck(), "Wait for the launch load to finish")
        XCTAssertTrue(field.exists, "Finishing the launch sign-in must not pop the daily back to the hub")
        XCTAssertFalse(app.buttons["homeTodayCard"].exists)
    }

    private func waitForEnabledCheck() -> Bool {
        let check = app.buttons["checkAnswer"]
        let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND isEnabled == true"), object: check)
        return XCTWaiter.wait(for: [enabled], timeout: 15) == .completed
    }

    func testHubIsThePlayRootAndOpensTodaysPuzzle() {
        launch()
        let card = app.buttons["homeTodayCard"]
        XCTAssertTrue(card.waitForExistence(timeout: 15))
        XCTAssertFalse(app.descendants(matching: .any)["answerField"].firstMatch.exists, "The daily is pushed from the hub, not the Play root")
        XCTAssertFalse(app.staticTexts["Make it click."].exists, "The hub has no large masthead")
        waitForLabel(card, containing: "3 guesses · 3 nudges")
        XCTAssertFalse(app.descendants(matching: .any)["homeStreakChip"].firstMatch.exists, "A zero streak hides the chip")

        openTodaysPuzzle(app)
        let back = app.navigationBars.buttons.firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 5))
        back.tap()

        XCTAssertTrue(card.waitForExistence(timeout: 5))
        XCTAssertFalse(app.descendants(matching: .any)["answerField"].firstMatch.exists)
    }
}
```

- [ ] **Step 3: Regenerate and run the hub test, confirming it fails.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodegen generate && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/HomeHubUITests/testHubIsThePlayRootAndOpensTodaysPuzzle
```

Expected: `** TEST FAILED **` at `XCTAssertTrue(card.waitForExistence(timeout: 15))`, because the root is still `TodayView`.

Then run the play-link test:

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/HomeHubUITests/testPlayLinkDuringLaunchLandsOnTodaysPuzzleAndStays
```

Expected: it passes against the old root, because the old root is the daily screen. This is the baseline. It must still pass after Steps 4–5. It fails if Step 5's player-reset guard is left out, because the hub then replaces the pushed daily once sign-in completes.

**Platform check.** `XCUIApplication.open(_:)` needs Xcode 14.3 or later (CI uses Xcode 26.3). If the simulator shows a confirmation for the app's own scheme that the springboard "Open" tap does not clear, delete this test, keep the Step 5 code, and record the gap in the PR body.

- [ ] **Step 4: Swap the Play root.** In `apps/ios/Rebuzzle/App/RebuzzleApp.swift`, replace:

```swift
            NavigationStack(path: $playPath) {
                TodayView()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
```

with:

```swift
            NavigationStack(path: $playPath) {
                HomeView()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
```

- [ ] **Step 5: Land return requests on the daily, including on cold launch.** In the same file, make two replacements.

First, the request handler. Replace:

```swift
        .onChange(of: returnRouter.request) { _, request in
            guard let request else { return }
            let source = returnRouter.entrySource
            model.saveDraft()
            model.selectedTab = .play
            playPath = NavigationPath()
            Task { @MainActor in
```

with:

```swift
        // `initial` also handles a notification or link that arrived before this view existed.
        .onChange(of: returnRouter.request, initial: true) { _, request in
            guard let request else { return }
            let source = returnRouter.entrySource
            model.saveDraft()
            model.selectedTab = .play
            // Notifications, links and shortcuts promise today's puzzle, so skip past the hub.
            var path = NavigationPath()
            path.append(RebuzzleRoute.daily)
            playPath = path
            Task { @MainActor in
```

Second, the player reset. Replace:

```swift
        .onChange(of: model.player?.id) {
            playPath = NavigationPath()
            journeyPath = NavigationPath()
            youPath = NavigationPath()
        }
```

with:

```swift
        .onChange(of: model.player?.id) { old, _ in
            // The first sign-in at launch is not an account change; resetting then would undo
            // a `.daily` push from a notification, link or quick tap.
            guard old != nil else { return }
            playPath = NavigationPath()
            journeyPath = NavigationPath()
            youPath = NavigationPath()
        }
```

`AppModel.load(entrySource:)` records `pendingEntrySource` before its `busy` guard. A return request that coincides with the launch load therefore still attributes the open to its source.

- [ ] **Step 6: Route `GameplayUITests.launchFixture` through the hub.** In `apps/ios/RebuzzleUITests/GameplayUITests.swift`, replace:

```swift
        app.launch()
        if extraArguments.contains("--ui-today-unavailable") {
            XCTAssertTrue(app.staticTexts["A puzzle worth waiting for"].waitForExistence(timeout: 15))
        } else if !extraArguments.contains("--ui-expired-reset-manual") &&
            !extraArguments.contains("--ui-score-locked") &&
            !extraArguments.contains("--ui-late-solve") {
            let submit = app.buttons["checkAnswer"]
            XCTAssertTrue(submit.waitForExistence(timeout: 15))
            XCTAssertTrue(waitForEnabled(submit, timeout: 15), "Wait for the restored daily session before interacting with the board.")
        }
    }
```

with:

```swift
        app.launch()
        if extraArguments.contains("--ui-today-unavailable") {
            XCTAssertTrue(app.staticTexts["A puzzle worth waiting for"].waitForExistence(timeout: 15))
        } else if extraArguments.contains("--ui-expired-reset-manual") {
            openTodaysPuzzle(app, until: app.staticTexts["You found it."])
        } else if extraArguments.contains("--ui-score-locked") {
            openTodaysPuzzle(app, until: app.staticTexts["scoreLockedMessage"])
        } else if extraArguments.contains("--ui-late-solve") {
            openTodaysPuzzle(app, until: app.staticTexts["lateSolveMessage"])
        } else {
            openTodaysPuzzle(app)
            let submit = app.buttons["checkAnswer"]
            XCTAssertTrue(submit.waitForExistence(timeout: 15))
            XCTAssertTrue(waitForEnabled(submit, timeout: 15), "Wait for the restored daily session before interacting with the board.")
        }
    }
```

- [ ] **Step 7: Open the daily after the manual relaunch.** In `testFirstSessionQuickStartExplainsPuzzleAndPersistsAfterRelaunch`, replace:

```swift
        app.launch()
        XCTAssertTrue(app.buttons["checkAnswer"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)
```

with:

```swift
        app.launch()
        openTodaysPuzzle(app)
        XCTAssertTrue(app.buttons["checkAnswer"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)
```

- [ ] **Step 8: Update the unavailable-daily quick-start test.** "How to play" lives on the daily screen, which cannot be opened without a puzzle. Replace:

```swift
        launchFixture(extraArguments: ["--ui-today-unavailable"], freshInstall: true)

        XCTAssertTrue(app.buttons["Try again"].isHittable)
        XCTAssertTrue(app.buttons["How to play"].exists)
        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)
```

with:

```swift
        launchFixture(extraArguments: ["--ui-today-unavailable"], freshInstall: true)

        XCTAssertTrue(app.buttons["Try again"].isHittable)
        XCTAssertFalse(app.buttons["homeTodayPlay"].exists, "There is nothing to open until today's puzzle loads")
        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)
```

- [ ] **Step 9: Make the identity-change test expect the hub.** Replace:

```swift
    func testIdentityChangeReturnsToTodayFromPushedJournal() {
        launchFixture()
        submit("lighthouse")
        let journal = app.buttons["keepConnection"]
        for _ in 0..<6 where !journal.isHittable { app.swipeUp() }
        journal.tap()
        XCTAssertTrue(app.navigationBars["Journal"].waitForExistence(timeout: 5))

        app.buttons["uiSimulateIdentityChange"].tap()

        XCTAssertTrue(app.navigationBars["Rebuzzle"].waitForExistence(timeout: 5), app.debugDescription)
        XCTAssertFalse(app.navigationBars["Journal"].exists)
    }
```

with:

```swift
    func testIdentityChangeReturnsToTheHubFromPushedJournal() {
        launchFixture()
        submit("lighthouse")
        let journal = app.buttons["keepConnection"]
        for _ in 0..<6 where !journal.isHittable { app.swipeUp() }
        journal.tap()
        XCTAssertTrue(app.navigationBars["Journal"].waitForExistence(timeout: 5))

        app.buttons["uiSimulateIdentityChange"].tap()

        XCTAssertTrue(app.buttons["homeTodayCard"].waitForExistence(timeout: 5), app.debugDescription)
        XCTAssertFalse(app.navigationBars["Journal"].exists)
    }
```

- [ ] **Step 10: Route `DailySolvePulseUITests.launchFixture` through the hub.** In `apps/ios/RebuzzleUITests/DailySolvePulseUITests.swift`, replace:

```swift
        app.launch()
        if extraArguments.contains("--ui-late-solve") {
            XCTAssertTrue(app.staticTexts["lateSolveMessage"].waitForExistence(timeout: 15))
            return
        }
        let submit = app.buttons["checkAnswer"]
```

with:

```swift
        app.launch()
        if extraArguments.contains("--ui-late-solve") {
            openTodaysPuzzle(app, until: app.staticTexts["lateSolveMessage"])
            return
        }
        openTodaysPuzzle(app)
        let submit = app.buttons["checkAnswer"]
```

- [ ] **Step 11: Regenerate and confirm the new UI-test files are listed.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodegen generate && grep -c "UITestSupport.swift\|HomeHubUITests.swift" Rebuzzle.xcodeproj/project.pbxproj
```

Expected: `8`, which is four entries per file.

- [ ] **Step 12: Run the hub test, the root-sensitive tests and the pulse suite.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/HomeHubUITests \
  -only-testing:RebuzzleUITests/DailySolvePulseUITests \
  -only-testing:RebuzzleUITests/GameplayUITests/testWrongGuessThenWin \
  -only-testing:RebuzzleUITests/GameplayUITests/testFirstSessionQuickStartExplainsPuzzleAndPersistsAfterRelaunch \
  -only-testing:RebuzzleUITests/GameplayUITests/testFirstSessionQuickStartWaitsForDailyAvailability \
  -only-testing:RebuzzleUITests/GameplayUITests/testShareLinkReturnsToTodayFromPushedJournal \
  -only-testing:RebuzzleUITests/GameplayUITests/testIdentityChangeReturnsToTheHubFromPushedJournal \
  -only-testing:RebuzzleUITests/GameplayUITests/testScoreLockedDailyOffersContinueWithoutRevealingAnswer \
  -only-testing:RebuzzleUITests/GameplayUITests/testLateSolveResultExplainsContinuationCount \
  -only-testing:RebuzzleUITests/GameplayUITests/testExpiredResultCanRefreshIntoTheNewDailyPuzzle \
  -only-testing:RebuzzleUITests/GameplayUITests/testTabNavigation \
  -only-testing:RebuzzleUITests/GameplayUITests/testRewardJourneyNavigationPreservesCompletedGame
```

Expected: `** TEST SUCCEEDED **`.
- The daily's title is still "Rebuzzle" at this point, so `testWrongGuessThenWin` and `testShareLinkReturnsToTodayFromPushedJournal` still match `navigationBars["Rebuzzle"]`.
- The share-link test now passes through the new `[.daily]` push.

If `testShareLinkReturnsToTodayFromPushedJournal` fails, Step 5 was not applied: without it, the share link lands on the hub, which has a hidden bar.

- [ ] **Step 13: Commit.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && git add Rebuzzle/App/RebuzzleApp.swift RebuzzleUITests/UITestSupport.swift RebuzzleUITests/HomeHubUITests.swift RebuzzleUITests/GameplayUITests.swift RebuzzleUITests/DailySolvePulseUITests.swift Rebuzzle.xcodeproj/project.pbxproj && git commit -m "feat(ios): open the Play tab on the game hub" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Remove the TodayView masthead and title the daily screen "Today"

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift` (`testWrongGuessThenWin`, `testShareLinkReturnsToTodayFromPushedJournal`, `testAccessibleTextGameplay`)

- [ ] **Step 1: Update the title assertions first, so they fail against the old title.** In `apps/ios/RebuzzleUITests/GameplayUITests.swift`, make three replacements.

In `testWrongGuessThenWin`, replace:

```swift
        let resultNavigationBar = app.navigationBars["Rebuzzle"]
```

with:

```swift
        let resultNavigationBar = app.navigationBars["Today"]
```

In `testShareLinkReturnsToTodayFromPushedJournal`, replace:

```swift
        app.buttons["uiSimulateShareLink"].tap()

        XCTAssertTrue(app.navigationBars["Rebuzzle"].waitForExistence(timeout: 5), app.debugDescription)
```

with:

```swift
        app.buttons["uiSimulateShareLink"].tap()

        XCTAssertTrue(app.navigationBars["Today"].waitForExistence(timeout: 5), app.debugDescription)
```

In `testAccessibleTextGameplay`, replace:

```swift
        revealTopWithinViewport(resultStreak, below: app.navigationBars["Rebuzzle"])
```

with:

```swift
        revealTopWithinViewport(resultStreak, below: app.navigationBars["Today"])
```

- [ ] **Step 2: Run them and confirm they fail.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/GameplayUITests/testShareLinkReturnsToTodayFromPushedJournal
```

Expected: `** TEST FAILED **` at `navigationBars["Today"].waitForExistence`.

- [ ] **Step 3: Drop the masthead and keep the scroll anchor.** In `apps/ios/Rebuzzle/Features/TodayView.swift`, replace:

```swift
            if let daily = model.daily {
                VStack(alignment: .leading, spacing: 6) {
                    let masthead = typeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                        : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
                    masthead {
                        Text("Make it click.")
                            .font(Theme.display(42)).tracking(-1.5)
                            .fixedSize(horizontal: false, vertical: true)
                        if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
                        EveAvatar(celebrating: model.game?.wasSuccessful == true)
                            .accessibilityLabel("Eve, your AI puzzle author")
                    }
                    Text("Daily puzzle · " + dateLabel)
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                .id("dailyHeader")
```

with:

```swift
            if let daily = model.daily {
                // The hub owns the masthead; this line anchors the scroll back to the top after a finish.
                Text("Daily puzzle · " + dateLabel)
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    .id("dailyHeader")
```

- [ ] **Step 4: Retitle the screen.** In the same file, replace:

```swift
        .navigationTitle("Rebuzzle").navigationBarTitleDisplayMode(.inline)
```

with:

```swift
        .navigationTitle("Today").navigationBarTitleDisplayMode(.inline)
```

- [ ] **Step 5: Build and run the title-sensitive tests and the hub test.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/HomeHubUITests \
  -only-testing:RebuzzleUITests/GameplayUITests/testWrongGuessThenWin \
  -only-testing:RebuzzleUITests/GameplayUITests/testShareLinkReturnsToTodayFromPushedJournal \
  -only-testing:RebuzzleUITests/GameplayUITests/testAccessibleTextGameplay \
  -only-testing:RebuzzleUITests/GameplayUITests/testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling \
  -only-testing:RebuzzleUITests/GameplayUITests/testFirstSessionQuickStartWorksAtAccessibilitySize
```

Expected: `** TEST SUCCEEDED **`. Also check that no Swift warning reports `typeSize` as unused: it is still used by the stage header, the nudge button and the thought button.

- [ ] **Step 6: Commit.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && git add Rebuzzle/Features/TodayView.swift RebuzzleUITests/GameplayUITests.swift && git commit -m "feat(ios): title the daily screen Today and hand the masthead to the hub" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: DEBUG preview screens `home` and `daily`

**Files:**
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift` (`openPreviewScreen()`)

- [ ] **Step 1: Add the cases.** In `apps/ios/Rebuzzle/App/RebuzzleApp.swift`, replace:

```swift
    /// `--preview-screen achievements|unlock` jumps straight to a screen for screenshots.
    private func openPreviewScreen() {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "--preview-screen"), index + 1 < args.count else { return }
        switch args[index + 1] {
        case "achievements":
```

with:

```swift
    /// `--preview-screen home|daily|achievements|unlock` jumps straight to a screen for screenshots.
    private func openPreviewScreen() {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "--preview-screen"), index + 1 < args.count else { return }
        switch args[index + 1] {
        case "home":
            model.selectedTab = .play
            playPath = NavigationPath()
        case "daily":
            model.selectedTab = .play
            var path = NavigationPath()
            path.append(RebuzzleRoute.daily)
            playPath = path
        case "achievements":
```

The `default:` branch, which selects Journey, is left unchanged. `home` must therefore set `.play` explicitly.

- [ ] **Step 2: Build and launch each screen on the simulator.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && SIM="${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" && \
xcrun simctl boot "$SIM" 2>/dev/null; xcrun simctl bootstatus "$SIM" -b && \
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle -destination "platform=iOS Simulator,id=$SIM" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData CODE_SIGN_IDENTITY=- build && \
xcrun simctl install "$SIM" /tmp/rebuzzle-hub-build/DerivedData/Build/Products/Debug-iphonesimulator/Rebuzzle.app && \
mkdir -p /tmp/rebuzzle-hub-shots && \
xcrun simctl launch --terminate-running-process "$SIM" com.byronwade.rebuzzle --preview --ui-returning-player --preview-screen daily && \
sleep 6 && xcrun simctl io "$SIM" screenshot /tmp/rebuzzle-hub-shots/task5-daily.png
```

Expected:
- `** BUILD SUCCEEDED **`, a launch line `com.byronwade.rebuzzle: <pid>`, and `Wrote screenshot to: /tmp/rebuzzle-hub-shots/task5-daily.png`.
- Open the PNG with the Read tool. It should show the daily board under an inline "Today" title, with a "Play" back button and no "Make it click."

- [ ] **Step 3: Commit.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && git add Rebuzzle/App/RebuzzleApp.swift && git commit -m "feat(ios): add home and daily preview screens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: Hub behavior tests (solved fixture, solve-and-back, mode cards, accessibility size)

These cover behavior built in Tasks 2–4. They should pass on first run. If one fails, debug it with superpowers:systematic-debugging before changing either the test or the view.

**Files:**
- Modify: `apps/ios/RebuzzleUITests/HomeHubUITests.swift`

- [ ] **Step 1: Add the tests.** In `apps/ios/RebuzzleUITests/HomeHubUITests.swift`, replace the final closing lines:

```swift
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        XCTAssertFalse(app.descendants(matching: .any)["answerField"].firstMatch.exists)
    }
}
```

with:

```swift
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        XCTAssertFalse(app.descendants(matching: .any)["answerField"].firstMatch.exists)
    }

    func testSolvedFixtureShowsSolvedInOnTheCard() {
        launch(["--ui-late-solve"])
        let card = app.buttons["homeTodayCard"]
        XCTAssertTrue(card.waitForExistence(timeout: 15))
        waitForLabel(card, containing: "Solved in 4")
        XCTAssertTrue(card.label.contains("new puzzle in"), card.label)
        XCTAssertEqual(app.buttons["homeTodayPlay"].label, "See result")
        let streak = app.descendants(matching: .any)["homeStreakChip"].firstMatch
        XCTAssertTrue(streak.waitForExistence(timeout: 10))
        XCTAssertEqual(streak.label, "1 day streak")
        capture("Hub — solved")

        openTodaysPuzzle(app, until: app.staticTexts["lateSolveMessage"])
    }

    func testSolvingTheDailyShowsTheSolvedStateBackOnTheHub() {
        launch()
        openTodaysPuzzle(app)
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        field.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        field.typeText("lighthouse")
        let check = app.buttons["checkAnswerFromKeyboard"]
        XCTAssertTrue(check.waitForExistence(timeout: 5))
        XCTAssertTrue(waitForEnabled(check), "Wait for the daily session before submitting")
        check.tap()
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 15))

        app.navigationBars["Today"].buttons.firstMatch.tap()

        let card = app.buttons["homeTodayCard"]
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        waitForLabel(card, containing: "Solved in 1")
        XCTAssertTrue(app.descendants(matching: .any)["homeStreakChip"].firstMatch.waitForExistence(timeout: 10))
    }

    func testModeCardsOfferTheArchiveAndHoldRushAndEndlessForLater() {
        launch()
        let rush = app.buttons["homeModeRush"]
        let endless = app.buttons["homeModeEndless"]
        let archive = app.buttons["homeModeArchive"]
        XCTAssertTrue(rush.waitForExistence(timeout: 15))
        for card in [rush, endless] {
            XCTAssertFalse(card.isEnabled, "\(card.label) ships in a later release")
            XCTAssertTrue(card.label.contains("Coming soon"), card.label)
            XCTAssertGreaterThanOrEqual(card.frame.height, 120)
        }
        XCTAssertTrue(rush.label.contains("3 minutes. Solve as many as you can."))
        XCTAssertTrue(endless.label.contains("One miss ends the run."))
        XCTAssertTrue(archive.label.contains("Replay any past puzzle."))
        capture("Hub — ways to play")

        for _ in 0..<5 where !archive.isHittable { app.swipeUp() }
        archive.tap()
        XCTAssertTrue(app.navigationBars["Puzzle archive"].waitForExistence(timeout: 5))
    }

    func testHubStaysUsableAtAccessibilityTextSize() {
        launch(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let play = app.buttons["homeTodayPlay"]
        XCTAssertTrue(play.waitForExistence(timeout: 15))
        XCTAssertTrue(waitForEnabled(play, timeout: 15))
        for _ in 0..<8 where !play.isHittable { app.swipeUp() }
        XCTAssertTrue(play.isHittable)
        XCTAssertGreaterThanOrEqual(play.frame.height, 44)
        capture("Hub — accessibility XXXL")
        play.tap()
        XCTAssertTrue(app.descendants(matching: .any)["answerField"].firstMatch.waitForExistence(timeout: 15))
    }

    private func waitForEnabled(_ element: XCUIElement, timeout: TimeInterval = 10) -> Bool {
        let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isEnabled == true"), object: element)
        return XCTWaiter.wait(for: [enabled], timeout: timeout) == .completed
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```

- [ ] **Step 2: Run the hub suite.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test \
  -only-testing:RebuzzleUITests/HomeHubUITests
```

Expected: `** TEST SUCCEEDED **` with 6 tests.

Two failures need specific handling:
- If `XCTAssertGreaterThanOrEqual(card.frame.height, 120)` fails, the disabled `Button` is reporting the label's intrinsic size. Fix the view, not the test: keep `.frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)` inside `ModeCard`, and confirm no outer frame shrinks it.
- If `homeTodayPlay` reports a label other than "See result", confirm that `.accessibilityLabel(status.buttonTitle)` sits on the CTA `NavigationLink`.

- [ ] **Step 3: Commit.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && git add RebuzzleUITests/HomeHubUITests.swift && git commit -m "test(ios): cover the hub's solved state, mode cards and large text" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 7: Final verification

**Files:** none changed, unless a check fails. A failure goes through superpowers:systematic-debugging, then back to the owning task.

- [ ] **Step 1: Regenerate and check that the project is unchanged.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodegen generate && git status --porcelain Rebuzzle.xcodeproj
```

Expected: no output. The committed `project.pbxproj` matches `project.yml`.

- [ ] **Step 2: Run the Core tests.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && swift test --package-path Core
```

Expected: all tests pass, including `TodayCardStatusTests` (10 tests).

- [ ] **Step 3: Run a generic simulator build, as CI does.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData CODE_SIGN_IDENTITY=- build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Run the full hosted unit and UI suite, as CI does.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData \
  -resultBundlePath /tmp/rebuzzle-hub-build/RebuzzleTests-$(date +%s).xcresult \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  CODE_SIGN_IDENTITY=- test
```

Expected: `** TEST SUCCEEDED **`. That covers `RebuzzleTests`, `GameplayUITests`, `DailySolvePulseUITests` and `HomeHubUITests`. The run takes tens of minutes, so start it with `run_in_background` and wait for it to exit.

- [ ] **Step 5: Take screenshots of the hub and the daily in light and dark mode.**

```sh
cd /Users/byronwade/ios-work/rebuzzle-hub/apps/ios && SIM="${SIMULATOR_UDID:-A85B71A2-531C-45C0-8550-A9A88146BAEE}" && \
xcrun simctl boot "$SIM" 2>/dev/null; xcrun simctl bootstatus "$SIM" -b && \
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle -destination "platform=iOS Simulator,id=$SIM" \
  -derivedDataPath /tmp/rebuzzle-hub-build/DerivedData CODE_SIGN_IDENTITY=- build && \
xcrun simctl install "$SIM" /tmp/rebuzzle-hub-build/DerivedData/Build/Products/Debug-iphonesimulator/Rebuzzle.app && \
mkdir -p /tmp/rebuzzle-hub-shots && \
xcrun simctl ui "$SIM" appearance light && \
xcrun simctl launch --terminate-running-process "$SIM" com.byronwade.rebuzzle --preview --ui-returning-player --preview-screen home && \
sleep 6 && xcrun simctl io "$SIM" screenshot /tmp/rebuzzle-hub-shots/home-light.png && \
xcrun simctl ui "$SIM" appearance dark && sleep 2 && \
xcrun simctl io "$SIM" screenshot /tmp/rebuzzle-hub-shots/home-dark.png && \
xcrun simctl ui "$SIM" appearance light && \
xcrun simctl launch --terminate-running-process "$SIM" com.byronwade.rebuzzle --preview --ui-returning-player --preview-screen daily && \
sleep 6 && xcrun simctl io "$SIM" screenshot /tmp/rebuzzle-hub-shots/daily-light.png
```

Expected: three `Wrote screenshot to:` lines. Open each PNG with the Read tool and check the following.

`home-light.png`:
- A header row with the date (e.g. "Sunday, Nov 1") on the left and Eve on the right. No streak chip, because the fixture streak is 0.
- A panel card showing "TODAY · REBUS", the difficulty badge, a shrunken light-bulb-plus-house board inside a 120pt band, "3 guesses · 3 nudges", and a dark "Play today’s →" button.
- "MORE WAYS TO PLAY", then Rush and Endless as dimmed tiles with "Coming soon", and Archive as a live tile on the second row.
- The tab bar with the reward-colored dot on Play.
- No navigation bar and no "Make it click."

`home-dark.png`: the same layout on the dark canvas, with readable panel borders and reward tint.

`daily-light.png`: an inline "Today" title with a "Play" back button, the "Daily puzzle · …" line, the board panel and the answer field. No masthead.

- [ ] **Step 6: Final review.** Run superpowers:requesting-code-review against `git diff main...feat/ios-game-hub -- apps/ios`, and resolve its findings with superpowers:receiving-code-review. Then use superpowers:finishing-a-development-branch to choose between a PR and a merge.

The PR body:
- names the decisions listed under "Decisions taken where the spec is silent";
- notes the renamed test `testIdentityChangeReturnsToTheHubFromPushedJournal`;
- ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Self-review against the spec

### Coverage, item by item

**Structure**
- `HomeView` is the Play root (Task 3 Step 4), and `TodayView` sits behind `RebuzzleRoute.daily` (Task 2 Steps 1–2).

**Header row**
- The date is shown as "Friday, Oct 31" via `weekday(.wide).month(.abbreviated).day()` (Task 2, `HomeView.dateLabel`).
- The streak chip shows flame plus count in reward tint and is hidden at 0 (`homeStreakChip`).
- `EveAvatar` sits on the right, and there is no large masthead.
- Verified by `testHubIsThePlayRootAndOpensTodaysPuzzle` and `testSolvedFixtureShowsSolvedInOnTheCard`.

**Today's card**
- `Theme.panel` with corner radius 14.
- The eyebrow shows the type and the `DifficultyBadge`.
- The preview is `PuzzleBoard` at about 120pt, inert and hidden from VoiceOver.
- The status line and a `CommitStyle` CTA follow the spec table: Not started, In progress, Solved and Out of guesses each map to their status line and button (Task 1 tests).
- Loading or failed reuses the existing notices and hides the CTA.
- Both the card and the button append `.daily` through `NavigationLink(value:)` on `playPath`.
- The countdown updates once a minute through `TimelineView(.periodic(…, by: 60))`.

**"More ways to play"**
- An eyebrow and a two-column `LazyVGrid`, which collapses to one column at accessibility sizes.
- Rush uses `bolt.fill`, Endless `infinity` and Archive `calendar`, each with the spec's copy.
- Rush and Endless are disabled with "Coming soon". Archive opens `ArchiveView` through `.archive`.
- Each card has a minimum height of 120, the whole card is the tap target, and labels are combined.
- Verified by `testModeCardsOfferTheArchiveAndHoldRushAndEndlessForLater`.

**Behavior**
- The tab badge expression is untouched (Task 3 changes only the root view inside the same `NavigationStack`).
- ReturnRouter requests reset to `[.daily]` (Task 3 Step 5), including on cold launch, verified by `testShareLinkReturnsToTodayFromPushedJournal` and `testPlayLinkDuringLaunchLandsOnTodaysPuzzleAndStays`.
- Popping back after a solve shows Solved (`testSolvingTheDailyShowsTheSolvedStateBackOnTheHub`).
- `--preview-screen home` and `daily` are added (Task 5).

**Files**
- Every file the spec names is created or modified. `TodayView` changes only the masthead and the title.
- The extra files (`TodayCardStatus`, UI-test support and hub tests, pbxproj) are required by the test plan and the tracked project file.

**Tests**
- `openTodaysPuzzle(app)` lives in the new shared support file and is used by both existing suites.
- The hub→daily→back test is in Task 3, and the "Solved in" fixture test is in Task 6, using the existing `--ui-late-solve` fixture, so no `PreviewData.swift` change is needed.

### Placeholder scan
- Every code step contains complete Swift. Every command has an expected outcome. There are no TBDs and no "similar to Task N".
- Exact old/new strings are given for every edit to an existing file.

### Type and identifier consistency
- `TodayCardStatus(game:hintCount:hintsShown:)`, `statusLine(nextPuzzle:now:)`, `buttonTitle`, `isFinished` and `countdown(until:now:)` are named identically in Task 1's tests, its implementation, and Task 2's `TodayPuzzleCard`.
- `DailyReturnTiming.deadline(_:)` and `remaining(until:now:)` are existing public Core APIs.
- `DifficultyTier.accessibilityLabel(difficulty:)`, `DailyStreakPresentation.journey(stats:)`, `PuzzleBoard(puzzle:)`, `EveAvatar(celebrating:)`, `Eyebrow(text:)`, `Page(spacing:bottomSafeAreaClearance:)` and `CommitStyle()` all exist with these signatures.
- `model.hintsShown`, `model.game`, `model.busy`, `model.stats`, `model.daily` and `model.error` are internal `AppModel` properties, visible to the app target.
- Identifiers are used consistently between views and tests: `homeTodayCard`, `homeTodayPlay`, `homeStreakChip`, `homeDate`, `homeModeRush`, `homeModeEndless` and `homeModeArchive`.
- `openTodaysPuzzle(_:until:)` is defined once and called in that form everywhere.
- The UI-test strings "3 guesses · 3 nudges", "Solved in 4" (late-solve fixture: correct guess at attempt 4), "Solved in 1", "See result" and "1 day streak" (the fixture's stats return streak 1 once the game is solved) match the Task 1 implementation and the fixture.

### Issues found and fixed inline
1. **Launch race.** Any early `.daily` push (a card tap, a ReturnRouter request, the Archive card) raced the launch-time `player.id` reset of `playPath`, and a notification tapped before `RootView` existed was never handled.
   - Root fix (Task 3 Step 5): the reset is skipped when the old id is nil, and the request handler uses `initial: true`.
   - Belt and braces: the card is gated on `model.game != nil || !model.busy`, and the helper waits for `isEnabled`.
   - Verified by `testPlayLinkDuringLaunchLandsOnTodaysPuzzleAndStays`.
   - This goes beyond the spec's list of `RebuzzleApp.swift` changes, but it is required for the spec's "notification still lands on the puzzle".
2. **Hub title.** Titling the hub "Rebuzzle" would have let stale assertions pass against the hub. Fixed by using "Play" with a hidden bar.
3. **Zero-hour countdown.** "0h" under an hour, and "0 guesses left" during a score-locked continuation, were both possible. Fixed with minute and "soon" fallbacks and a `.continuing` state, each covered by tests.
4. **Commit ordering.** A commit could otherwise have left the suite red. Fixed by moving the ReturnRouter push and all `launchFixture` changes into Task 3 alongside the root swap. Task 4 changes the "Today" title and its three assertions together.
5. **Fixtures without an answer field.** Score-locked, late-solve and expired-reset have none. Fixed with the `until:` landmark parameter.
