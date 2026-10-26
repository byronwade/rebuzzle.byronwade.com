import XCTest

@MainActor final class GameplayUITests: XCTestCase {
    private var app: XCUIApplication!

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
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        for _ in 0..<5 where !field.isHittable { app.swipeUp() }
        field.tap()
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
        let submit = app.buttons["checkAnswer"]
        for _ in 0..<5 where !submit.isHittable { app.swipeUp() }
        submit.tap()
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

    func testPlusShowsMyCompletedPuzzleBeforePurchase() {
        launchFixture()
        submit("lighthouse")
        let journal = app.buttons["keepConnection"]
        for _ in 0..<10 where !journal.isHittable { app.swipeUp() }
        journal.tap()
        app.buttons["Explore Rebuzzle Plus"].tap()
        let preview = app.staticTexts["plusPreviewAnswer"]
        for _ in 0..<10 where !preview.isHittable { app.swipeUp() }
        XCTAssertTrue(preview.exists)
        XCTAssertEqual(preview.label, "lighthouse")
        capture("Plus — personal journal preview")
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

    func testAccessibleTextGameplay() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["eveReply-1"].waitForExistence(timeout: 5))
        capture("Conversation — accessibility XXXL")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        capture("Today — accessibility XXXL solved")
        let journey = app.buttons["viewJourney"]
        for _ in 0..<10 where !journey.isHittable { app.swipeUp() }
        journey.tap()
        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("125 XP"))
        XCTAssertTrue(app.staticTexts["journeyLevel"].exists)
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
        for _ in 0..<8 where !journey.isHittable { app.swipeUp() }
        journey.tap()
        XCTAssertTrue(app.staticTexts["journeyXP"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["journeyXP"].label.contains("150 XP"))
        capture("Journey — first reward")
        let journal = app.buttons["openJournal"]
        for _ in 0..<8 where !journal.isHittable { app.swipeUp() }
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

    private func submit(_ guess: String) {
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        for _ in 0..<5 where !field.isHittable { app.swipeUp() }
        field.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 2) { field.tap() }
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 3))
        field.typeText(guess)
        let button = app.buttons["checkAnswer"]
        for _ in 0..<5 where !button.isHittable { app.swipeUp() }
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
