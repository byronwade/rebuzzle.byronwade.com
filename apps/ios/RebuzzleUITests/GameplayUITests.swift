import XCTest
import StoreKitTest

@MainActor final class GameplayUITests: XCTestCase {
    private var app: XCUIApplication!
    private var store: SKTestSession!

    override func setUp() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        store = try SKTestSession(contentsOf: url)
        store.resetToDefaultState()
        store.disableDialogs = true
        store.clearTransactions()
        XCTAssertTrue(store.allTransactions().isEmpty, "Every UI test starts without a purchase")
    }

    override func tearDown() async throws {
        app?.terminate()
        store?.clearTransactions()
        store?.resetToDefaultState()
        store = nil
    }

    private func launchFixture(extraArguments: [String] = [], freshInstall: Bool = false) {
        continueAfterFailure = false
        app = XCUIApplication()
        let playerState = freshInstall ? "--ui-fresh-install" : "--ui-returning-player"
        app.launchArguments = ["--ui-fixture", playerState, "-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + extraArguments
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

    func testCanonicalBoardUsesReviewedImageEvenInUnicodeMode() {
        launchFixture(extraArguments: ["--ui-canonical-board"])
        let board = app.images["canonicalPuzzleBoard"]
        XCTAssertTrue(board.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(board.frame.width, 100)
        XCTAssertGreaterThan(board.frame.height, 20)
        XCTAssertEqual(board.frame.width / board.frame.height, 768.0 / 248.0, accuracy: 0.03, "Reviewed image must retain its aspect ratio")
        capture("Canonical board — exact reviewed pixels")
        app.buttons["studyPuzzle"].tap()
        XCTAssertTrue(app.images["canonicalPuzzleBoard"].waitForExistence(timeout: 5))
        capture("Canonical board — study")
    }

    func testInvalidCanonicalBoardNeverFallsBackToLegacyClue() {
        launchFixture(extraArguments: ["--ui-canonical-invalid"])
        XCTAssertTrue(app.staticTexts["Puzzle image unavailable"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.images["canonicalPuzzleBoard"].exists)
        capture("Canonical board — unavailable")
    }

    func testStudyPuzzlePreservesDraftAndGuesses() {
        launchFixture()
        let field = focusAnswerField()
        field.typeText("sun")
        app.buttons["dismissAnswerKeyboard"].tap()
        let study = app.buttons["studyPuzzle"]
        for _ in 0..<5 where !study.isHittable { app.swipeDown() }
        study.tap()
        XCTAssertTrue(app.navigationBars["Study puzzle"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)
        capture("Study puzzle")
        app.buttons["closeStudyPuzzle"].tap()
        XCTAssertEqual(field.value as? String, "sun")
        XCTAssertTrue(app.staticTexts["3 guesses remaining"].exists)
        XCTAssertFalse(app.staticTexts["guessFeedback"].exists)
    }

    func testDailyThoughtCanBeSavedAndReopenedWithoutChangingTheGuess() {
        launchFixture()
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap()
        field.typeText("sun")
        app.buttons["dismissAnswerKeyboard"].tap()

        let progress = app.descendants(matching: .any)["dailyGuessProgress"].firstMatch
        XCTAssertEqual(progress.value as? String, "3 guesses remaining")
        let saveThought = app.buttons["saveDailyThought"]
        for _ in 0..<5 where !saveThought.isHittable { app.swipeUp() }
        XCTAssertTrue(saveThought.waitForExistence(timeout: 5))
        saveThought.tap()

        let editor = app.textViews["dailyThoughtEditor"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        editor.tap()
        editor.typeText("Maybe sunshine is hidden in the layout")
        app.buttons["dismissDailyThoughtKeyboard"].tap()
        app.buttons["closeDailyThought"].tap()

        XCTAssertEqual(field.value as? String, "sun")
        XCTAssertEqual(progress.value as? String, "3 guesses remaining")
        XCTAssertFalse(app.staticTexts["guessFeedback"].exists)
        saveThought.tap()
        XCTAssertEqual(editor.value as? String, "Maybe sunshine is hidden in the layout")
        XCTAssertEqual(progress.value as? String, "3 guesses remaining")
        capture("Daily thought — saved privately while the puzzle stays in progress")
    }

    func testDailyThoughtEditorSupportsAccessibilityTextAndKeyboardDismissal() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let saveThought = app.buttons["saveDailyThought"]
        for _ in 0..<8 where !saveThought.isHittable { app.swipeUp() }
        XCTAssertTrue(saveThought.waitForExistence(timeout: 5))
        saveThought.tap()

        let editor = app.textViews["dailyThoughtEditor"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(editor.frame.height, 100)
        editor.tap()
        editor.typeText("A hunch for later")
        app.buttons["dismissDailyThoughtKeyboard"].tap()
        XCTAssertTrue(editor.isHittable)
        capture("Daily thought editor — accessibility text size")
        app.buttons["closeDailyThought"].tap()
        XCTAssertEqual(app.descendants(matching: .any)["dailyGuessProgress"].value as? String, "3 guesses remaining")
        capture("Daily thought — accessibility text size")
    }

    func testDailyThoughtSheetClosesAndClearsAtPuzzleExpiry() {
        launchFixture(extraArguments: ["--ui-daily-thought-expiry"])
        let saveThought = app.buttons["saveDailyThought"]
        for _ in 0..<5 where !saveThought.isHittable { app.swipeUp() }
        XCTAssertTrue(saveThought.waitForExistence(timeout: 5))
        saveThought.tap()

        let editor = app.textViews["dailyThoughtEditor"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        editor.tap()
        editor.typeText("hunch")
        let thoughtSheet = app.navigationBars["Save a thought"]
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: thoughtSheet)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 35), .completed)
        XCTAssertFalse(app.textViews["dailyThoughtEditor"].exists)
        XCTAssertFalse(saveThought.exists)
        capture("Daily thought — cleared and closed at puzzle expiry")
    }

    func testDismissKeyboardPreservesUnsubmittedAnswer() {
        verifyKeyboardDismissal()
    }

    func testAccessibleKeyboardDismissalPreservesUnsubmittedAnswer() {
        verifyKeyboardDismissal(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
    }

    func testFirstSessionQuickStartExplainsPuzzleAndPersistsAfterRelaunch() {
        launchFixture(freshInstall: true)

        XCTAssertTrue(app.navigationBars["Your first puzzle"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Sun + flower = sunflower"].exists)
        XCTAssertTrue(app.staticTexts["Three scored guesses. Then keep solving until it clicks."].exists)
        XCTAssertFalse(app.staticTexts["lighthouse"].exists, "The quick-start must not reveal today’s answer")
        capture("First-session quick-start")
        app.buttons["quickStartStartPlaying"].tap()

        let answerField = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertTrue(answerField.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["checkAnswer"].isHittable)
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["guessFeedback"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["sunshine"].exists)
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)

        app.terminate()
        app = XCUIApplication()
        app.launchArguments = ["--ui-fixture", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        XCTAssertTrue(app.buttons["checkAnswer"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)

        app.buttons["How to play"].tap()
        XCTAssertTrue(app.navigationBars["How to play"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].exists, "Manual help should not reveal today’s answer")
    }

    func testExistingInstallWithPriorProgressSkipsQuickStartWithoutPreference() {
        launchFixture(extraArguments: ["--ui-existing-install"], freshInstall: true)

        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)
        XCTAssertTrue(app.staticTexts["sunrise"].waitForExistence(timeout: 5))
        let checkAnswer = app.buttons["checkAnswer"]
        XCTAssertTrue(checkAnswer.waitForExistence(timeout: 5))
        for _ in 0..<5 where !checkAnswer.isHittable { app.swipeUp() }
        XCTAssertTrue(checkAnswer.isHittable)
    }

    func testFirstSessionQuickStartWorksAtAccessibilitySize() {
        launchFixture(
            extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"],
            freshInstall: true
        )

        XCTAssertTrue(app.navigationBars["Your first puzzle"].waitForExistence(timeout: 5))
        let close = app.buttons["quickStartClose"]
        let startPlaying = app.buttons["quickStartStartPlaying"]
        XCTAssertTrue(startPlaying.isHittable)
        XCTAssertTrue(app.frame.contains(startPlaying.frame), "The primary action should stay fully onscreen at accessibility XXXL")
        XCTAssertTrue(close.isHittable)
        capture("First-session quick-start — accessibility XXXL")
        close.tap()
        let checkAnswer = app.buttons["checkAnswer"]
        XCTAssertTrue(checkAnswer.waitForExistence(timeout: 5))
        for _ in 0..<8 where !checkAnswer.isHittable { app.swipeUp() }
        XCTAssertTrue(checkAnswer.isHittable)
    }

    func testFirstSessionQuickStartWaitsForDailyAvailability() {
        launchFixture(extraArguments: ["--ui-today-unavailable"], freshInstall: true)

        XCTAssertTrue(app.buttons["Try again"].isHittable)
        XCTAssertTrue(app.buttons["How to play"].exists)
        XCTAssertFalse(app.navigationBars["Your first puzzle"].exists)
    }

    func testEveNudgesBecomeConversationTurnsAndRemainAnswerBlind() {
        launchFixture()
        let askForNudge = app.buttons["askEveForNudge"]
        XCTAssertTrue(askForNudge.waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["eveNudge-1"].exists)

        askForNudge.tap()
        let firstNudge = app.staticTexts["eveNudge-1"]
        XCTAssertTrue(firstNudge.waitForExistence(timeout: 5))
        XCTAssertEqual(firstNudge.label, "Read each clue from left to right.")
        XCTAssertEqual(app.staticTexts.matching(identifier: "eveNudge-1").count, 1,
                        "Each revealed hint should appear only once in the conversation")
        XCTAssertEqual(
            app.staticTexts.matching(NSPredicate(format: "label == %@", "Read each clue from left to right.")).count,
            1,
            "No separate static hint block should duplicate the conversation message"
        )
        let answerField = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertLessThan(firstNudge.frame.maxY, askForNudge.frame.minY)
        XCTAssertLessThan(askForNudge.frame.maxY, answerField.frame.minY,
                          "The nudge action should sit between the conversation and the next guess")
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)
        XCTAssertFalse(app.staticTexts["guessFeedback"].exists)

        submit("sunshine")
        XCTAssertTrue(app.staticTexts["guessFeedback"].waitForExistence(timeout: 5))
        let firstGuess = app.staticTexts["sunshine"]
        XCTAssertTrue(firstGuess.waitForExistence(timeout: 5))
        XCTAssertLessThan(firstNudge.frame.maxY, firstGuess.frame.minY,
                          "A nudge requested before the first guess should stay before that guess")

        let secondAsk = app.buttons["askEveForNudge"]
        for _ in 0..<6 where !secondAsk.isHittable { app.swipeUp() }
        XCTAssertTrue(secondAsk.isHittable)
        XCTAssertGreaterThan(secondAsk.frame.minY, firstGuess.frame.maxY)
        XCTAssertLessThan(secondAsk.frame.maxY, answerField.frame.minY)
        secondAsk.tap()
        let secondNudge = app.staticTexts["eveNudge-2"]
        XCTAssertTrue(secondNudge.waitForExistence(timeout: 5))
        XCTAssertEqual(secondNudge.label, "Name each picture plainly.")
        XCTAssertGreaterThan(secondNudge.frame.minY, firstGuess.frame.maxY,
                             "A nudge requested after the first guess should follow it in the conversation")
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)

        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["askEveForNudge"].exists)
        XCTAssertTrue(app.staticTexts["eveNudge-1"].exists)
        XCTAssertTrue(app.staticTexts["eveNudge-2"].exists)
    }

    func testNudgeActionIsHiddenWhenThereAreNoHints() {
        launchFixture(extraArguments: ["--ui-no-hints"])
        XCTAssertFalse(app.buttons["askEveForNudge"].exists)
    }

    func testNudgeActionDisappearsAfterTheLastAuthoredHint() {
        launchFixture()
        for index in 1...3 {
            let ask = app.buttons["askEveForNudge"]
            for _ in 0..<8 where !ask.isHittable { app.swipeUp() }
            XCTAssertTrue(ask.isHittable)
            ask.tap()
            XCTAssertTrue(app.staticTexts["eveNudge-\(index)"].waitForExistence(timeout: 5))
        }
        XCTAssertFalse(app.buttons["askEveForNudge"].exists)
        XCTAssertTrue(app.staticTexts["eveNudge-3"].exists)
        XCTAssertFalse(app.staticTexts["eveNudge-4"].exists)
    }

    func testNudgeRemainsAvailableDuringScoreLockedContinuation() {
        launchFixture(extraArguments: ["--ui-score-locked"])
        let ask = app.buttons["askEveForNudge"]
        reveal(ask)
        ask.tap()
        XCTAssertTrue(app.staticTexts["eveNudge-1"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].firstMatch.exists)
        XCTAssertTrue(app.buttons["continueSolving"].exists)
    }

    func testNudgeControlStaysTappableAtAccessibilitySizeAfterKeyboardDismissal() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let nudgeDescription = app.staticTexts["A hint appears in your conversation"]
        XCTAssertTrue(nudgeDescription.waitForExistence(timeout: 5))
        XCTAssertGreaterThanOrEqual(nudgeDescription.frame.width, 250,
                                    "Accessibility-size hint copy should use a wide text layout")
        let field = focusAnswerField()
        field.typeText("sun")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        app.buttons["dismissAnswerKeyboard"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))

        let ask = app.buttons["askEveForNudge"]
        reveal(ask)
        XCTAssertGreaterThanOrEqual(ask.frame.height, 44)
        ask.tap()
        XCTAssertTrue(app.staticTexts["eveNudge-1"].waitForExistence(timeout: 5))
        capture("Eve nudge at accessibility size")
        XCTAssertEqual(field.value as? String, "sun")
    }

    func testKeyboardCheckWaitsForProgressRefreshAfterUnconfirmedSubmission() {
        launchFixture(extraArguments: ["--ui-guess-unavailable"])
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        field.tap()
        field.typeText("sunshine")

        let submit = app.buttons["checkAnswerFromKeyboard"]
        XCTAssertTrue(submit.waitForExistence(timeout: 5))
        submit.tap()
        XCTAssertTrue(app.staticTexts["We couldn’t confirm that response. Refresh progress before trying again."]
            .waitForExistence(timeout: 5))

        field.tap()
        let unavailableSubmit = app.buttons["checkAnswerFromKeyboard"]
        XCTAssertTrue(unavailableSubmit.waitForExistence(timeout: 5))
        XCTAssertFalse(unavailableSubmit.isEnabled)
        let hide = app.buttons["dismissAnswerKeyboard"]
        XCTAssertTrue(hide.isHittable)
        hide.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Refresh progress"].exists)
    }

    private func verifyKeyboardDismissal(extraArguments: [String] = []) {
        launchFixture(extraArguments: extraArguments)
        let field = focusAnswerField()
        field.typeText("sun")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let dismiss = app.buttons["dismissAnswerKeyboard"]
        XCTAssertTrue(dismiss.waitForExistence(timeout: 5))
        XCTAssertTrue(dismiss.isHittable)
        capture("Keyboard — dismiss control")
        dismiss.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))
        XCTAssertEqual(field.value as? String, "sun")
        XCTAssertFalse(app.staticTexts["guessFeedback"].exists)
        XCTAssertTrue(field.isHittable, "The answer field must remain reachable after dismissing the keyboard.")
        print("DIAG before-refocus frame=\(field.frame) hittable=\(field.isHittable)")
        field.tap()
        let firstTap = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        print("DIAG refocus-first-tap keyboard=\(firstTap)")
        if !firstTap {
            print("DIAG HIERARCHY-BEGIN\n\(app.debugDescription)\nDIAG HIERARCHY-END")
            field.tap()
            print("DIAG refocus-second-tap keyboard=\(app.keyboards.firstMatch.waitForExistence(timeout: 5))")
            field.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            print("DIAG refocus-coordinate-tap keyboard=\(app.keyboards.firstMatch.waitForExistence(timeout: 5))")
        }
        XCTAssertTrue(firstTap)
        field.typeText("shine")
        let submitFromKeyboard = app.buttons["checkAnswerFromKeyboard"]
        XCTAssertTrue(submitFromKeyboard.waitForExistence(timeout: 5))
        XCTAssertTrue(submitFromKeyboard.isHittable)
        submitFromKeyboard.tap()
        XCTAssertTrue(app.staticTexts["2 guesses remaining"].waitForExistence(timeout: 5))
    }

    func testWrongGuessThenWin() {
        launchFixture()
        XCTAssertTrue(app.buttons["checkAnswer"].isHittable, "The daily game should be ready to play without scrolling")
        let guessProgress = app.descendants(matching: .any)["dailyGuessProgress"]
        XCTAssertTrue(guessProgress.waitForExistence(timeout: 5))
        XCTAssertEqual(guessProgress.label, "Guess progress")
        XCTAssertEqual(guessProgress.value as? String, "3 guesses remaining")
        capture("Today — ready")
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["2 guesses remaining"].waitForExistence(timeout: 5))
        XCTAssertEqual(guessProgress.value as? String, "2 guesses remaining")
        XCTAssertFalse(app.staticTexts["lighthouse"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["guessFeedback"].exists)
        XCTAssertTrue(app.staticTexts["A fresh angle might help."].exists)
        let feedbackVisible = NSPredicate(format: "hittable == true")
        expectation(for: feedbackVisible, evaluatedWith: app.staticTexts["A fresh angle might help."])
        waitForExpectations(timeout: 3)
        XCTAssertTrue(app.staticTexts["eveReply-1"].waitForExistence(timeout: 5))
        capture("Today — wrong guess")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.otherElements.matching(NSPredicate(format: "label == %@", "2 of 3 guesses, solved")).firstMatch.exists)
        XCTAssertTrue(app.staticTexts["lighthouse"].firstMatch.exists)
        XCTAssertFalse(app.buttons["checkAnswer"].exists)
        let streakCard = app.descendants(matching: .any)["dailyStreakCard"].firstMatch
        XCTAssertTrue(streakCard.waitForExistence(timeout: 5), "The result should include a daily streak card")
        let currentStreak = NSPredicate(format: "label CONTAINS %@", "Current streak: 1 day")
        expectation(for: currentStreak, evaluatedWith: streakCard)
        waitForExpectations(timeout: 5)
        XCTAssertTrue(streakCard.label.contains("Best streak: 1 day"))
        XCTAssertTrue(streakCard.label.contains("2 days left to the 3-day mark"))
        let earnedXP = app.staticTexts["earnedXP"]
        XCTAssertTrue(earnedXP.exists)
        XCTAssertLessThan(streakCard.frame.minY, earnedXP.frame.minY,
                          "The new streak reward should follow the solve before the XP summary")
        let resultNavigationBar = app.navigationBars["Rebuzzle"]
        let resultTabBar = app.tabBars.firstMatch
        XCTAssertGreaterThanOrEqual(streakCard.frame.minY, resultNavigationBar.frame.maxY)
        XCTAssertLessThan(streakCard.frame.minY, resultTabBar.frame.minY,
                          "The streak reward should appear in the initial solve viewport")
        capture("Today — solved")
        let journal = app.buttons["keepConnection"]
        for _ in 0..<6 where !journal.isHittable { app.swipeUp() }
        XCTAssertTrue(journal.exists)
        journal.tap()
        XCTAssertTrue(app.staticTexts["Keep the moments when it clicked."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Explore Rebuzzle Plus"].exists)
        capture("Journal — from result")
    }

    func testScoreLockedDailyOffersContinueWithoutRevealingAnswer() {
        launchFixture(extraArguments: ["--ui-score-locked"])

        XCTAssertTrue(app.staticTexts["scoreLockedMessage"].waitForExistence(timeout: 5))
        reveal(app.buttons["continueSolving"])
        XCTAssertTrue(app.buttons["continueSolving"].isHittable)
        reveal(app.buttons["revealAnswer"])
        XCTAssertTrue(app.buttons["revealAnswer"].isHittable)
        XCTAssertFalse(app.staticTexts["lighthouse"].firstMatch.exists)

        app.buttons["continueSolving"].tap()
        XCTAssertTrue(app.buttons["checkAnswer"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].firstMatch.exists)

        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["lateSolveMessage"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["You found it."].exists)
        XCTAssertTrue(app.staticTexts["lighthouse"].firstMatch.exists)
    }

    func testLateSolveResultExplainsContinuationCount() {
        launchFixture(extraArguments: ["--ui-late-solve"])

        XCTAssertTrue(app.staticTexts["lateSolveMessage"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["4"].exists)
        XCTAssertTrue(app.staticTexts["Total guesses"].exists)
        XCTAssertFalse(app.staticTexts["4/3"].exists)
        let attemptHistory = app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@", "3 scored guesses, 1 continuation guess, solved")
        ).firstMatch
        XCTAssertTrue(attemptHistory.exists)
    }

    func testExpiredAnswerReviewNeverBlocksTodaysPuzzle() {
        launchFixture(extraArguments: ["--ui-expired-review"])

        XCTAssertTrue(app.buttons["reviewExpiredAnswer"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["checkAnswer"].isHittable)
        XCTAssertFalse(app.staticTexts["expiredReviewAnswer"].exists)

        app.buttons["reviewExpiredAnswer"].tap()
        XCTAssertTrue(app.staticTexts["expiredReviewAnswer"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["checkAnswer"].isHittable)
    }

    func testDailyResultShareOpensFromTheInitialResultViewport() {
        launchFixture()
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))

        let share = app.buttons["dailyResultShare"]
        XCTAssertTrue(share.waitForExistence(timeout: 5))
        XCTAssertTrue(share.isHittable, "The result share action should be visible without scrolling")
        XCTAssertEqual(share.label, "Challenge a friend")
        capture("Daily result share action")
        share.tap()

        let shareSheet = app.otherElements["ActivityListView"]
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 5), app.debugDescription)
        capture("Daily result native share sheet")
    }

    func testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling() {
        launchFixture()
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))

        let countdown = app.otherElements["puzzleCountdown"]
        XCTAssertTrue(countdown.waitForExistence(timeout: 5))
        XCTAssertTrue(countdown.isHittable, "The next-puzzle countdown should be visible on the completed result screen")

        let reminder = app.buttons["configureReminder"]
        XCTAssertTrue(reminder.isHittable, "Setting an optional reminder should not require scrolling")
        XCTAssertEqual(reminder.label, "Remind me", "The reminder action should explain its purpose without relying on its bell icon")
        XCTAssertGreaterThanOrEqual(reminder.frame.height, 44, "The optional reminder action should have a comfortable touch target")
        let streakCard = app.descendants(matching: .any)["dailyStreakCard"].firstMatch
        XCTAssertTrue(streakCard.isHittable, "The return cue should not displace the streak celebration off screen")
        capture("Result · countdown and optional reminder in first viewport")
    }

    func testExpiredResultCanRefreshIntoTheNewDailyPuzzle() {
        launchFixture(extraArguments: ["--ui-expired-reset-manual"])
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["A fresh puzzle is ready"].waitForExistence(timeout: 5))
        XCTAssertFalse(
            app.staticTexts["How did today’s puzzle feel?"].exists,
            "A stale daily result cannot be rated against the next puzzle date."
        )

        let refresh = app.buttons["checkForTodayPuzzle"]
        XCTAssertTrue(refresh.waitForExistence(timeout: 5))
        XCTAssertTrue(refresh.isHittable)
        refresh.tap()

        XCTAssertTrue(app.buttons["checkAnswer"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["You found it."].exists)
    }

    func testShareLinkReturnsToTodayFromPushedJournal() {
        launchFixture()
        submit("lighthouse")
        let journal = app.buttons["keepConnection"]
        for _ in 0..<6 where !journal.isHittable { app.swipeUp() }
        journal.tap()
        XCTAssertTrue(app.navigationBars["Journal"].waitForExistence(timeout: 5))

        app.buttons["uiSimulateShareLink"].tap()

        XCTAssertTrue(app.navigationBars["Rebuzzle"].waitForExistence(timeout: 5), app.debugDescription)
        XCTAssertFalse(app.navigationBars["Journal"].exists)
    }

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

    func testDailyResultShareRemainsAccessibleAtAccessibilityTextSize() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))

        let share = app.buttons["dailyResultShare"]
        XCTAssertTrue(share.waitForExistence(timeout: 5))
        XCTAssertEqual(share.label, "Challenge a friend")
        for _ in 0..<5 where !share.isHittable { app.swipeUp() }
        XCTAssertTrue(share.isHittable, "The share action should remain reachable at accessibility text sizes")
        capture("Daily result share · accessibility XXXL")
    }

    func testCountdownAndReminderDiscovery() { verifyCountdownAndReminders() }
    func testAccessibleCountdownAndReminders() {
        verifyCountdownAndReminders(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
    }
    private func verifyCountdownAndReminders(extraArguments: [String] = []) {
        launchFixture(extraArguments: extraArguments)
        submit("lighthouse")
        let scrollView = app.scrollViews.firstMatch
        let countdown = app.otherElements["puzzleCountdown"]
        XCTAssertTrue(scrollView.waitForExistence(timeout: 5))
        XCTAssertTrue(countdown.waitForExistence(timeout: 5))
        for _ in 0..<14 where !scrollView.frame.contains(countdown.frame) {
            scrollView.swipeUp()
        }
        XCTAssertTrue(
            scrollView.frame.contains(countdown.frame),
            "The countdown should be visible in the scroll view"
        )
        XCTAssertEqual(countdown.label, "Next puzzle countdown")
        XCTAssertTrue((countdown.value as? String)?.contains("remaining") == true)
        capture("Next puzzle countdown")
        let reminder = app.buttons["configureReminder"]
        for _ in 0..<10 where !reminder.isHittable { scrollView.swipeUp() }
        XCTAssertEqual(reminder.label, "Remind me")
        XCTAssertGreaterThanOrEqual(reminder.frame.height, 44)
        reminder.tap()
        XCTAssertTrue(app.switches["Daily reminder"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Your daily invitation"].exists)
        capture("Daily reminder settings")
    }

    func testRealPurchaseDeliversJournalNotesInsightsAndRestoresAfterRelaunch() throws {
        launchFixture(extraArguments: ["--ui-empty-study-hints"])
        submit("lighthouse")
        try purchasePlusAndOpenJournal()
        let entry = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Solved")).firstMatch
        XCTAssertTrue(entry.waitForExistence(timeout: 5))
        XCTAssertFalse(entry.label.localizedCaseInsensitiveContains("lighthouse"), "Journal rows must not spoil the answer")
        XCTAssertTrue(entry.label.localizedCaseInsensitiveContains("rebus"), "Journal rows should identify the puzzle type")
        entry.tap()
        XCTAssertTrue(app.navigationBars["Study puzzle"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["journalStudyAnswer"].exists)
        XCTAssertFalse(app.staticTexts["journalStudyExplanation"].exists)
        XCTAssertFalse(app.staticTexts["journalStudyHint.1"].exists)
        XCTAssertFalse(app.buttons["checkAnswer"].exists, "Studying a past puzzle must not submit a scored guess")
        capture("Journal study — answer hidden")
        for (index, hint) in [
            "Read each clue from left to right.",
            "Name each picture plainly.",
            "Join the parts into one familiar word."
        ].enumerated() {
            let revealHint = app.buttons["revealJournalHint"]
            reveal(revealHint)
            XCTAssertTrue(revealHint.label.contains("\(index + 1)"))
            revealHint.tap()
            let revealed = app.staticTexts["journalStudyHint.\(index + 1)"]
            XCTAssertTrue(revealed.waitForExistence(timeout: 5))
            XCTAssertEqual(revealed.label, hint)
            if index < 2 { XCTAssertFalse(app.staticTexts["journalStudyHint.\(index + 2)"].exists) }
            if index == 0 { capture("Journal study — first hint") }
        }
        XCTAssertFalse(app.staticTexts["journalStudyHint.4"].exists, "Empty saved hints should not create blank numbered steps")
        XCTAssertFalse(app.buttons["revealJournalHint"].exists, "All saved hints should reveal in their original order")
        let revealAnswer = app.buttons["revealJournalAnswer"]
        reveal(revealAnswer)
        revealAnswer.tap()
        XCTAssertEqual(app.staticTexts["journalStudyAnswer"].label, "lighthouse")
        XCTAssertTrue(app.staticTexts["journalStudyExplanation"].label.localizedCaseInsensitiveContains("Light + house"))
        let note = app.textFields.firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 5))
        reveal(note)
        XCTAssertTrue(note.isEnabled)
        note.tap()
        note.typeText("Light and house made the connection click.")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(entry.waitForExistence(timeout: 5))
        entry.tap()
        XCTAssertFalse(app.staticTexts["journalStudyAnswer"].exists, "Reopening a study entry should start spoiler-free")
        let revealAgain = app.buttons["revealJournalAnswer"]
        reveal(revealAgain)
        revealAgain.tap()
        XCTAssertTrue(note.waitForExistence(timeout: 5))
        XCTAssertEqual(note.value as? String, "Light and house made the connection click.")
        capture("Plus — purchased journal and note")
        selectTab("Journey")
        let insights = app.staticTexts["How you find the answer"]
        reveal(insights)
        XCTAssertTrue(insights.exists)
        XCTAssertTrue(app.staticTexts["Solve rate"].exists)
        capture("Plus — paid solving insights")

        // Gameplay fixture intentionally starts fresh storage each launch; StoreKit ownership must survive.
        app.terminate()
        launchFixture()
        selectTab("You")
        XCTAssertTrue(
            app.descendants(matching: .any)
                .matching(identifier: "settingsIdentityLoaded")
                .firstMatch
                .waitForExistence(timeout: 15),
            "Wait for the fixture account to load before testing purchase navigation after relaunch."
        )
        let plus = app.buttons["Rebuzzle Plus"]
        reveal(plus)
        plus.tap()
        XCTAssertTrue(app.staticTexts["You have Rebuzzle Plus"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Unlock Plus")).firstMatch.exists)
        let restore = app.buttons["Restore purchases"]
        reveal(restore)
        restore.tap()
        XCTAssertTrue(app.staticTexts["Plus restored."].waitForExistence(timeout: 15))
        XCTAssertEqual(store.allTransactions().count, 1, "Restore must not repurchase")
        capture("Plus — restored ownership")
    }

    func testAccessibleStudyWithoutSavedHintsStillOffersAnswerReveal() throws {
        launchFixture(extraArguments: ["--ui-no-hints", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        submit("lighthouse")
        try purchasePlusAndOpenJournal(openFromPlusScreen: false)
        let entry = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Solved")).firstMatch
        XCTAssertTrue(entry.waitForExistence(timeout: 5))
        XCTAssertFalse(entry.label.localizedCaseInsensitiveContains("lighthouse"))
        for _ in 0..<12 where !entry.isHittable { app.swipeDown() }
        XCTAssertTrue(entry.isHittable, "Return the accessibility-size Journal list to the saved entry before opening it")
        entry.tap()
        XCTAssertTrue(app.navigationBars["Study puzzle"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journalStudyNoHints"].waitForExistence(timeout: 5))
        let revealAnswer = app.buttons["revealJournalAnswer"]
        reveal(revealAnswer)
        XCTAssertGreaterThanOrEqual(revealAnswer.frame.height, 44, "The answer reveal remains comfortably tappable at accessibility text sizes")
        revealAnswer.tap()
        XCTAssertTrue(app.staticTexts["journalStudyAnswer"].waitForExistence(timeout: 5))
        capture("Journal study — accessibility size, no saved hints")
    }

    private func purchasePlusAndOpenJournal(openFromPlusScreen: Bool = true) throws {
        let journal = app.buttons["keepConnection"]
        reveal(journal)
        journal.tap()
        let explore = app.buttons["Explore Rebuzzle Plus"]
        reveal(explore)
        explore.tap()
        let unlock = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Unlock Plus")).firstMatch
        XCTAssertTrue(unlock.waitForExistence(timeout: 15), "Real StoreKit product must load")
        reveal(unlock)
        unlock.tap()
        XCTAssertTrue(app.staticTexts["You have Rebuzzle Plus"].waitForExistence(timeout: 15))
        XCTAssertEqual(store.allTransactions().count, 1, "The UI must perform one actual StoreKit test purchase")
        if openFromPlusScreen {
            let open = app.buttons["openPlusJournal"]
            reveal(open)
            open.tap()
        } else {
            let back = app.navigationBars.buttons.firstMatch
            XCTAssertTrue(back.waitForExistence(timeout: 5))
            back.tap()
            XCTAssertTrue(app.staticTexts["Keep the moments when it clicked."].waitForExistence(timeout: 5))
        }
    }

    private func reveal(_ element: XCUIElement) {
        for _ in 0..<10 where !element.isHittable { app.swipeUp() }
        XCTAssertTrue(element.isHittable)
    }

    private func revealTopWithinViewport(_ element: XCUIElement, below navigationBar: XCUIElement) {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(navigationBar.waitForExistence(timeout: 5))
        XCTAssertTrue(tabBar.waitForExistence(timeout: 5))
        for _ in 0..<8 {
            if element.frame.minY < navigationBar.frame.maxY {
                app.swipeDown()
            } else if element.frame.minY >= tabBar.frame.minY {
                app.swipeUp()
            } else {
                break
            }
        }
        XCTAssertGreaterThanOrEqual(element.frame.minY, navigationBar.frame.maxY,
                                    "The card should begin below the navigation bar")
        XCTAssertLessThan(element.frame.minY, tabBar.frame.minY,
                          "The card should begin within the visible scroll area")
    }

    func testPlusShowsMyCompletedPuzzleBeforePurchase() {
        launchFixture()
        submit("lighthouse")
        let journal = app.buttons["keepConnection"]
        for _ in 0..<10 where !journal.isHittable { app.swipeUp() }
        journal.tap()
        app.buttons["Explore Rebuzzle Plus"].tap()
        XCTAssertTrue(app.staticTexts["Study completed puzzles again, reveal available hints one at a time, then see the answer."].exists)
        let preview = app.staticTexts["plusPreviewAnswer"]
        for _ in 0..<10 where !preview.isHittable { app.swipeUp() }
        XCTAssertTrue(preview.exists)
        XCTAssertEqual(preview.label, "lighthouse")
        capture("Plus — personal journal preview")
    }

    func testFreeArchiveSampleIsAvailableWhileTheFullArchiveStaysLocked() {
        launchFixture()
        selectTab("You")
        let plus = app.buttons["Rebuzzle Plus"]
        reveal(plus)
        plus.tap()

        XCTAssertTrue(app.staticTexts["Past daily puzzles"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["openFreeArchiveSample"].exists)
        XCTAssertFalse(app.buttons["openPuzzleArchive"].exists, "The full archive stays reserved for Plus")
        XCTAssertFalse(app.otherElements["archiveLoading"].exists, "A non-Plus account must not request archive content")
    }

    func testFreeArchiveSampleOffersPlusOnlyAfterTheRoundEnds() {
        launchFixture()
        selectTab("You")
        app.buttons["Rebuzzle Plus"].tap()

        let freeSampleLink = app.buttons["openFreeArchiveSample"]
        XCTAssertTrue(freeSampleLink.waitForExistence(timeout: 5))
        freeSampleLink.tap()
        XCTAssertTrue(app.navigationBars["Puzzle archive"].waitForExistence(timeout: 5))

        let sample = app.buttons["archiveFreeSample"]
        XCTAssertTrue(sample.waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].exists, "The free archive preview must remain answer blind")
        sample.tap()

        XCTAssertTrue(app.navigationBars["Practice"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["practiceUnscored"].label, "Sample · unscored")
        XCTAssertFalse(app.buttons["freeSamplePlusCTA"].exists, "Do not interrupt an active sample round with an upsell")

        submitPractice("lighthouse")
        XCTAssertTrue(app.staticTexts["practiceSolutionAnswer"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["freeSamplePlusCTA"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.descendants(matching: .any)["dailyStreakCard"].exists)
        XCTAssertFalse(app.staticTexts["earnedXP"].exists)

        app.buttons["restartPracticeRound"].tap()
        XCTAssertFalse(app.buttons["freeSamplePlusCTA"].exists)
        for (index, guess) in ["first try", "second try", "third try"].enumerated() {
            if index > 0 {
                XCTAssertTrue(waitForEnabled(app.buttons["checkPracticeAnswer"]), "Wait for each practice response before the next guess")
            }
            submitPractice(guess)
        }
        XCTAssertTrue(app.buttons["revealPracticeSolution"].waitForExistence(timeout: 5))
        app.buttons["revealPracticeSolution"].tap()
        XCTAssertTrue(app.staticTexts["practiceSolutionAnswer"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["freeSamplePlusCTA"].waitForExistence(timeout: 5))

        let plusCTA = app.buttons["freeSamplePlusCTA"]
        reveal(plusCTA)
        plusCTA.tap()
        XCTAssertTrue(app.navigationBars["Rebuzzle Plus"].waitForExistence(timeout: 5))
    }

    func testPracticeEveFailureCanBeRetriedWithoutSubmittingAnotherGuess() {
        launchFixture(extraArguments: ["--ui-quip-fails-once"])
        selectTab("You")
        app.buttons["Rebuzzle Plus"].tap()

        let freeSample = app.buttons["openFreeArchiveSample"]
        XCTAssertTrue(freeSample.waitForExistence(timeout: 5))
        freeSample.tap()
        XCTAssertTrue(app.navigationBars["Puzzle archive"].waitForExistence(timeout: 5))
        app.buttons["archiveFreeSample"].tap()
        XCTAssertTrue(app.navigationBars["Practice"].waitForExistence(timeout: 5))

        submitPractice("sunshine")
        let failure = app.staticTexts["practiceEveReplyFailure.1"]
        XCTAssertTrue(failure.waitForExistence(timeout: 5))
        XCTAssertTrue(failure.label.contains("Your guess is saved"))

        let retry = app.buttons["retryPracticeEveReply.1"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        retry.tap()

        let reply = app.staticTexts["practiceEveReply.1"]
        XCTAssertTrue(reply.waitForExistence(timeout: 5))
        XCTAssertTrue(reply.label.contains("That guess took the scenic route"))
        XCTAssertTrue(app.staticTexts["practiceAttemptsRemaining"].label.contains("2 left"))
        XCTAssertFalse(app.staticTexts["Guess 2 of 3"].exists)
    }

    func testPracticeEveFailureRemainsRetryableAfterSolving() {
        launchFixture(extraArguments: ["--ui-quip-fails-once"])
        selectTab("You")
        app.buttons["Rebuzzle Plus"].tap()

        let freeSample = app.buttons["openFreeArchiveSample"]
        XCTAssertTrue(freeSample.waitForExistence(timeout: 5))
        freeSample.tap()
        XCTAssertTrue(app.navigationBars["Puzzle archive"].waitForExistence(timeout: 5))
        app.buttons["archiveFreeSample"].tap()
        XCTAssertTrue(app.navigationBars["Practice"].waitForExistence(timeout: 5))

        submitPractice("lighthouse")
        XCTAssertTrue(app.staticTexts["practiceSolutionAnswer"].waitForExistence(timeout: 5))

        let failure = app.staticTexts["practiceEveReplyFailure.1"]
        XCTAssertTrue(failure.waitForExistence(timeout: 5))
        let retry = app.buttons["retryPracticeEveReply.1"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        reveal(retry)
        retry.tap()

        XCTAssertTrue(app.staticTexts["practiceEveReply.1"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["practiceSolutionAnswer"].exists)
    }

    func testPlusArchivePracticeIsUnscoredHintedAndAnswerBlindUntilSolvedOrRevealed() throws {
        launchFixture()
        selectTab("You")
        let plus = app.buttons["Rebuzzle Plus"]
        reveal(plus)
        plus.tap()
        let unlock = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Unlock Plus")).firstMatch
        XCTAssertTrue(unlock.waitForExistence(timeout: 15))
        reveal(unlock)
        unlock.tap()
        XCTAssertTrue(app.staticTexts["You have Rebuzzle Plus"].waitForExistence(timeout: 15))

        let archive = app.buttons["openPuzzleArchive"]
        reveal(archive)
        archive.tap()
        XCTAssertTrue(app.navigationBars["Puzzle archive"].waitForExistence(timeout: 5))
        let firstPuzzle = app.buttons["archivePuzzle.archive-lighthouse"]
        XCTAssertTrue(firstPuzzle.waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].exists, "Archive metadata must not expose an answer")
        firstPuzzle.tap()

        XCTAssertTrue(app.navigationBars["Practice"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["practiceUnscored"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["practiceUnscoredNote"].exists)
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)
        XCTAssertTrue(app.buttons["checkPracticeAnswer"].exists)

        let hintButton = app.buttons["revealPracticeHint"]
        reveal(hintButton)
        hintButton.tap()
        XCTAssertEqual(app.staticTexts["practiceHint.1"].label, "Read each clue from left to right.")
        XCTAssertFalse(app.staticTexts["practiceHint.2"].exists)

        let answer = app.textFields["practiceAnswerField"]
        reveal(answer)
        answer.tap()
        answer.typeText("not it")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let dismiss = app.buttons["dismissPracticeKeyboard"]
        XCTAssertTrue(dismiss.waitForExistence(timeout: 5))
        dismiss.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))
        XCTAssertEqual(answer.value as? String, "not it")
        app.buttons["checkPracticeAnswer"].tap()
        XCTAssertTrue(app.staticTexts["practiceAttemptsRemaining"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["practiceAttemptsRemaining"].label, "2 left")
        XCTAssertFalse(app.staticTexts["lighthouse"].exists, "Wrong practice feedback must remain answer blind")

        let checkPracticeAnswer = app.buttons["checkPracticeAnswer"]
        XCTAssertTrue(waitForEnabled(checkPracticeAnswer), "Wait for the first practice response before entering another guess")
        answer.tap()
        answer.typeText("lighthouse")
        let keyboardCheckPracticeAnswer = app.buttons["checkPracticeAnswerFromKeyboard"]
        XCTAssertTrue(keyboardCheckPracticeAnswer.waitForExistence(timeout: 5))
        keyboardCheckPracticeAnswer.tap()
        XCTAssertTrue(app.staticTexts["practiceSolutionAnswer"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["practiceSolutionAnswer"].label, "lighthouse")
        XCTAssertFalse(app.descendants(matching: .any)["dailyStreakCard"].exists)
        XCTAssertFalse(app.staticTexts["earnedXP"].exists)

        app.buttons["restartPracticeRound"].tap()
        XCTAssertTrue(app.buttons["checkPracticeAnswer"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["practiceAttemptsRemaining"].label, "3 left")
        XCTAssertFalse(app.staticTexts["practiceSolutionAnswer"].exists)
        XCTAssertFalse(app.buttons["revealPracticeSolution"].exists, "The solution reveal becomes available only after the round ends")
        for (index, guess) in ["first try", "second try", "third try"].enumerated() {
            if index > 0 {
                XCTAssertTrue(waitForEnabled(checkPracticeAnswer), "Wait for the previous practice response before entering another guess")
            }
            submitPractice(guess)
            if index < 2 {
                XCTAssertEqual(app.staticTexts["practiceAttemptsRemaining"].label, "\(2 - index) left")
                XCTAssertFalse(app.buttons["revealPracticeSolution"].exists)
            } else {
                XCTAssertTrue(app.buttons["revealPracticeSolution"].waitForExistence(timeout: 10))
            }
        }
        app.buttons["revealPracticeSolution"].tap()
        XCTAssertTrue(app.staticTexts["practiceSolutionAnswer"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["practiceSolutionAnswer"].label, "lighthouse")
        app.buttons["restartPracticeRound"].tap()
        XCTAssertEqual(app.staticTexts["practiceAttemptsRemaining"].label, "3 left")

        selectTab("Play")
        XCTAssertTrue(app.staticTexts["3 guesses remaining"].waitForExistence(timeout: 5), "Archive practice must leave today's guesses untouched")
        capture("Plus archive — unscored practice")
    }

    func testPlusBenefitsAreExplainedBeforePurchasePrompt() {
        launchFixture()
        selectTab("You")
        let plus = app.buttons["Rebuzzle Plus"]
        reveal(plus)
        plus.tap()

        let firstBenefit = app.staticTexts["Past daily puzzles"]
        let unlock = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Unlock Plus")).firstMatch
        XCTAssertTrue(firstBenefit.waitForExistence(timeout: 10))
        XCTAssertTrue(unlock.waitForExistence(timeout: 10))
        XCTAssertLessThan(firstBenefit.frame.maxY, unlock.frame.minY, "Explain the Plus benefits before asking players to purchase")
    }

    func testThreeWrongGuessesLockScoreWithoutRevealingAnswer() {
        launchFixture()
        for (index, guess) in ["sunshine", "moonlight", "daybreak"].enumerated() {
            submit(guess)
            if index < 2 { XCTAssertTrue(app.staticTexts["\(2 - index) \(index == 1 ? "guess" : "guesses") remaining"].waitForExistence(timeout: 5)) }
        }
        XCTAssertTrue(app.staticTexts["scoreLockedMessage"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].firstMatch.exists)
        reveal(app.buttons["revealAnswer"])
        app.buttons["revealAnswer"].tap()
        XCTAssertTrue(app.staticTexts["Here’s the connection."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["lighthouse"].firstMatch.exists)
        XCTAssertFalse(app.buttons["checkAnswer"].exists)
        capture("Today — revealed")
    }

    func testQualityFeedbackIsOptionalAfterSolve() {
        launchFixture()
        submit("lighthouse")

        XCTAssertTrue(app.staticTexts["How did today’s puzzle feel?"].waitForExistence(timeout: 5))
        let rating = app.buttons["qualityRating.tough_but_fair"]
        for _ in 0..<8 where !rating.isHittable { app.swipeUp() }
        XCTAssertTrue(rating.isHittable)
        rating.tap()

        let thanks = app.descendants(matching: .any)["qualityFeedbackThanks"]
        XCTAssertTrue(thanks.waitForExistence(timeout: 5))
        XCTAssertTrue(thanks.label.localizedCaseInsensitiveContains("thanks"))
        XCTAssertTrue(app.staticTexts["You found it."].exists)
        XCTAssertTrue(app.staticTexts["lighthouse"].firstMatch.exists)
        XCTAssertFalse(app.buttons["checkAnswer"].exists)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Challenge a friend")).firstMatch.exists)
    }

    func testQualityFeedbackWorksAfterRevealAtAccessibilitySize() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        for guess in ["sunshine", "moonlight", "daybreak"] { submit(guess) }
        reveal(app.buttons["revealAnswer"])
        app.buttons["revealAnswer"].tap()

        XCTAssertTrue(app.staticTexts["How did today’s puzzle feel?"].waitForExistence(timeout: 5))
        let rating = app.buttons["qualityRating.unclear"]
        for _ in 0..<16 where !rating.isHittable { app.swipeUp() }
        XCTAssertTrue(rating.isHittable)
        rating.tap()

        let thanks = app.descendants(matching: .any)["qualityFeedbackThanks"]
        XCTAssertTrue(thanks.waitForExistence(timeout: 5))
        XCTAssertTrue(thanks.label.localizedCaseInsensitiveContains("thanks"))
        XCTAssertTrue(app.staticTexts["Here’s the connection."].exists)
        XCTAssertTrue(app.staticTexts["lighthouse"].firstMatch.exists)
        XCTAssertFalse(app.buttons["checkAnswer"].exists)
    }

    func testAccessibleTextGameplay() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["eveReply-1"].waitForExistence(timeout: 5))
        capture("Conversation — accessibility XXXL")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        let resultStreak = app.descendants(matching: .any)["dailyStreakCard"].firstMatch
        XCTAssertTrue(resultStreak.waitForExistence(timeout: 5))
        revealTopWithinViewport(resultStreak, below: app.navigationBars["Rebuzzle"])
        capture("Today — accessibility XXXL solved")
        let journey = app.buttons["viewJourney"]
        for _ in 0..<10 where !journey.isHittable { app.swipeUp() }
        journey.tap()
        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("125 XP"))
        XCTAssertTrue(app.staticTexts["journeyLevel"].exists)
        let journeyStreak = app.descendants(matching: .any)["journeyDailyStreak"].firstMatch
        XCTAssertTrue(journeyStreak.waitForExistence(timeout: 5))
        XCTAssertLessThan(journeyStreak.frame.minY, app.staticTexts["journeyXP"].frame.minY,
                          "The streak should lead the Journey progress summary")
        let journeyNavigationBar = app.navigationBars["Journey"]
        revealTopWithinViewport(journeyStreak, below: journeyNavigationBar)
        XCTAssertTrue(journeyStreak.isHittable)
        XCTAssertTrue(journeyStreak.label.contains("Current streak: 1 day"))
        XCTAssertTrue(journeyStreak.label.contains("Best streak: 1 day"))
        XCTAssertLessThanOrEqual(app.staticTexts["journeyLevel"].frame.maxY, app.staticTexts["journeyXP"].frame.minY)
        capture("Journey — accessibility XXXL")
    }

    func testConversationSurvivesCompletion() {
        launchFixture()
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["2 guesses remaining"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["eveReply-1"].waitForExistence(timeout: 5))
        submit("moonlight")
        XCTAssertTrue(app.staticTexts["1 guess remaining"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["eveReply-2"].waitForExistence(timeout: 5))
        capture("Conversation — two guesses")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        for _ in 0..<8 where !app.staticTexts["eveReply-3"].isHittable { app.swipeUp() }
        XCTAssertTrue(app.staticTexts["eveReply-1"].exists)
        XCTAssertTrue(app.staticTexts["eveReply-2"].exists)
        XCTAssertTrue(app.staticTexts["eveReply-3"].exists)
        capture("Conversation — completed")
    }

    func testEveUnavailableDoesNotInterruptGame() {
        launchFixture(extraArguments: ["--ui-quip-unavailable"])
        app.buttons["askEveForNudge"].tap()
        XCTAssertTrue(app.staticTexts["eveNudge-1"].waitForExistence(timeout: 5),
                      "Authored hints should not depend on Eve’s optional AI reply service")
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["A fresh angle might help."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["eveReply-1"].exists)
        XCTAssertFalse(app.buttons["Refresh progress"].exists)
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
    }

    func testFailedEveReplyCanBeRetriedWithoutSubmittingAnotherGuess() {
        launchFixture(extraArguments: ["--ui-quip-fails-once"])
        submit("sunshine")

        let failure = app.staticTexts["eveReplyFailure-1"]
        XCTAssertTrue(failure.waitForExistence(timeout: 5))
        XCTAssertTrue(failure.label.contains("Your guess is saved"))
        let retry = app.buttons["retryEveReply-1"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        retry.tap()

        let reply = app.staticTexts["eveReply-1"]
        XCTAssertTrue(reply.waitForExistence(timeout: 5))
        XCTAssertTrue(reply.label.contains("That guess took the scenic route"))
        XCTAssertTrue(app.staticTexts["2 guesses remaining"].exists)
        XCTAssertFalse(app.staticTexts["YOU · GUESS 2"].exists)
    }

    func testRewardJourneyNavigationPreservesCompletedGame() {
        launchFixture()
        selectTab("Journey")
        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("0 XP"))
        selectTab("Play")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        let journey = app.buttons["viewJourney"]
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.exists, "The app should expose its native tab bar")
        for _ in 0..<12 {
            if journey.isHittable && journey.frame.maxY <= tabBar.frame.minY { break }
            app.swipeUp()
        }
        XCTAssertTrue(journey.isHittable)
        XCTAssertLessThanOrEqual(journey.frame.maxY, tabBar.frame.minY,
                                 "The Journey call to action should scroll clear of the floating tab bar")
        journey.tap()
        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("150 XP"))
        capture("Journey — first reward")
        let journal = app.buttons["openJournal"]
        // Keep the entire link clear of navigation chrome; hittable alone includes overlays.
        for _ in 0..<8 {
            let frame = journal.frame
            if journal.isHittable && frame.minY > 140 && frame.maxY < app.frame.height * 0.7 { break }
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: frame.minY <= 140 ? 0.65 : 0.35))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        XCTAssertTrue(journal.isHittable)
        XCTAssertGreaterThan(journal.frame.minY, 140)
        XCTAssertLessThan(journal.frame.maxY, app.frame.height * 0.7)
        capture("Journey — journal link clear of navigation chrome")
        journal.tap()
        XCTAssertTrue(app.staticTexts["Keep the moments when it clicked."].waitForExistence(timeout: 5))
        selectTab("You")
        XCTAssertTrue(app.staticTexts["Appearance"].waitForExistence(timeout: 5))
        selectTab("Play")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
    }

    func testWeeklyTrailPreviewAndEarnedBonusUpdateAfterTodaysPuzzle() {
        launchFixture(extraArguments: ["--ui-journey-days-2"])
        selectTab("Journey")
        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("50 XP"))
        XCTAssertTrue(app.staticTexts["Finish 3 puzzle days this week to earn +50 XP."].exists)

        selectTab("Play")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        let journey = app.buttons["viewJourney"]
        for _ in 0..<12 where !journey.isHittable { app.swipeUp() }
        journey.tap()

        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("250 XP"))
        XCTAssertTrue(app.staticTexts["+50 XP earned this week"].exists)
        let trail = app.descendants(matching: .any)["weeklyTrailProgress"].firstMatch
        XCTAssertTrue(trail.exists)
        XCTAssertTrue(trail.label.contains("3 of 3 days"))
        XCTAssertTrue(trail.label.contains("50 XP reward earned"))
    }

    func testTabNavigation() {
        launchFixture()
        for (tab, heading) in [("Journey", "Curious mind"), ("You", "Appearance")] {
            selectTab(tab)
            XCTAssertTrue(app.staticTexts[heading].waitForExistence(timeout: 5))
            capture(tab)
        }
        selectTab("Play")
        XCTAssertTrue(app.buttons["checkAnswer"].exists)
    }

    private func focusAnswerField() -> XCUIElement {
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        for _ in 0..<5 where !field.isHittable { app.swipeUp() }
        field.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 2) { field.tap() }
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 3))
        return field
    }

    private func submit(_ guess: String) {
        focusAnswerField().typeText(guess)
        let button = app.buttons["checkAnswerFromKeyboard"]
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        XCTAssertTrue(waitForEnabled(button, timeout: 15), "Wait for the daily session to be ready before submitting the guess.")
        button.tap()
    }

    private func submitPractice(_ guess: String) {
        let field = app.textFields["practiceAnswerField"]
        reveal(field)
        field.tap()
        field.typeText(guess)
        let dismiss = app.buttons["dismissPracticeKeyboard"]
        if dismiss.exists && dismiss.isHittable { dismiss.tap() }
        let button = app.buttons["checkPracticeAnswer"]
        reveal(button)
        button.tap()
    }

    private func waitForEnabled(_ element: XCUIElement, timeout: TimeInterval = 10) -> Bool {
        let enabled = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "isEnabled == true"),
            object: element
        )
        return XCTWaiter.wait(for: [enabled], timeout: timeout) == .completed
    }

    private func selectTab(_ name: String) {
        let tabBarButton = app.tabBars.buttons[name]
        if tabBarButton.exists { tabBarButton.tap() }
        else { app.descendants(matching: .any).matching(identifier: name).firstMatch.tap() }
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
