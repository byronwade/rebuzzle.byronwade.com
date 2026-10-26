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

    func testWrongGuessThenWin() {
        launchFixture()
        XCTAssertTrue(app.buttons["checkAnswer"].isHittable, "The daily game should be ready to play without scrolling")
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
        XCTAssertTrue(app.staticTexts["You found it."].exists)
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
