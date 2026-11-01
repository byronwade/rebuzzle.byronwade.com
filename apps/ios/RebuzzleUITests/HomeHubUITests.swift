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
