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
        capture("Today — ready")
        submit("sunshine")
        XCTAssertTrue(app.staticTexts["2 guesses remaining"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["lighthouse"].exists)
        XCTAssertTrue(app.staticTexts["guessFeedback"].exists)
        XCTAssertTrue(app.staticTexts["A fresh angle might help."].exists)
        capture("Today — wrong guess")
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["lighthouse"].exists)
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
            if index < 2 { XCTAssertTrue(app.staticTexts["\(2 - index) guesses remaining"].waitForExistence(timeout: 5)) }
        }
        XCTAssertTrue(app.staticTexts["Here’s the connection."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["lighthouse"].exists)
        XCTAssertFalse(app.buttons["checkAnswer"].exists)
        capture("Today — revealed")
    }

    func testAccessibleTextGameplay() {
        launchFixture(extraArguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        submit("lighthouse")
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 5))
        capture("Today — accessibility XXXL solved")
    }

    func testTabNavigation() {
        launchFixture()
        for (tab, heading) in [("Progress", "Keep showing up."), ("Journal", "Keep the moments when it clicked."), ("Settings", "Appearance")] {
            selectTab(tab)
            XCTAssertTrue(app.staticTexts[heading].waitForExistence(timeout: 5))
            capture(tab)
        }
        selectTab("Today")
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
