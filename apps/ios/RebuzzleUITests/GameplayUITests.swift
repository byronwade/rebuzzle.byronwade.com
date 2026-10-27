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

    private func launchFixture(extraArguments: [String] = []) {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-fixture", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + extraArguments
        app.launch()
        XCTAssertTrue(app.buttons["checkAnswer"].waitForExistence(timeout: 15))
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

    func testDismissKeyboardPreservesUnsubmittedAnswer() {
        verifyKeyboardDismissal()
    }

    func testAccessibleKeyboardDismissalPreservesUnsubmittedAnswer() {
        verifyKeyboardDismissal(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
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
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        for _ in 0..<5 where !field.isHittable { app.swipeUp() }
        field.tap()
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
        field.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
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
        if app.tabBars.firstMatch.exists {
            XCTAssertLessThanOrEqual(app.buttons["checkAnswer"].frame.maxY, app.tabBars.firstMatch.frame.minY,
                                     "The complete answer button must clear the floating tab bar")
        }
        capture("Today — ready")
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["2 guesses remaining"].waitForExistence(timeout: 5))
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

    func testCountdownAndReminderDiscovery() { verifyCountdownAndReminders() }
    func testAccessibleCountdownAndReminders() {
        verifyCountdownAndReminders(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
    }
    private func verifyCountdownAndReminders(extraArguments: [String] = []) {
        launchFixture(extraArguments: extraArguments)
        submit("lighthouse")
        let countdown = app.otherElements["puzzleCountdown"]
        for _ in 0..<14 where !countdown.isHittable { app.swipeUp() }
        XCTAssertTrue(countdown.isHittable)
        capture("Next puzzle countdown")
        let reminder = app.buttons["configureReminder"]
        for _ in 0..<10 where !reminder.isHittable { app.swipeUp() }
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

    func testArchiveEntryStaysLockedUntilPlusIsVerified() {
        launchFixture()
        selectTab("You")
        let plus = app.buttons["Rebuzzle Plus"]
        reveal(plus)
        plus.tap()

        XCTAssertTrue(app.staticTexts["Past daily puzzles"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["openPuzzleArchive"].exists)
        XCTAssertFalse(app.otherElements["archiveLoading"].exists, "A non-Plus account must not request archive content")
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

        answer.tap()
        answer.typeText("lighthouse")
        app.buttons["checkPracticeAnswer"].tap()
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
            submitPractice(guess)
            if index < 2 {
                XCTAssertEqual(app.staticTexts["practiceAttemptsRemaining"].label, "\(2 - index) left")
                XCTAssertFalse(app.buttons["revealPracticeSolution"].exists)
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

    func testThreeWrongGuessesRevealAnswer() {
        launchFixture()
        for (index, guess) in ["sunshine", "moonlight", "daybreak"].enumerated() {
            submit(guess)
            if index < 2 { XCTAssertTrue(app.staticTexts["\(2 - index) \(index == 1 ? "guess" : "guesses") remaining"].waitForExistence(timeout: 5)) }
        }
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
        XCTAssertTrue(app.staticTexts["eveReply-1"].waitForExistence(timeout: 5))
        submit("moonlight")
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
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["A fresh angle might help."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["eveReply-1"].exists)
        XCTAssertFalse(app.buttons["Refresh progress"].exists)
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
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
        let dismissKeyboard = app.buttons["dismissAnswerKeyboard"]
        if dismissKeyboard.exists { dismissKeyboard.tap() }
        let button = app.buttons["checkAnswer"]
        for _ in 0..<5 where !button.isHittable { app.swipeUp() }
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
