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

    func testSolvedFixtureShowsSolvedInOnTheCard() {
        launch(["--ui-late-solve"])
        let card = app.buttons["homeTodayCard"]
        XCTAssertTrue(card.waitForExistence(timeout: 15))
        waitForLabel(card, containing: "Solved in 4")
        XCTAssertTrue(card.label.contains("new puzzle in"), card.label)
        // The card is the single accessibility stop, so its label ends with the CTA title.
        XCTAssertTrue(card.label.contains("See result"), card.label)
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

    /// Choosing to keep solving is a decision about the puzzle, not the screen, so it survives a trip back to the hub.
    func testKeepSolvingSurvivesReturningToTheHub() {
        launch(["--ui-score-locked"])
        openTodaysPuzzle(app, until: app.staticTexts["scoreLockedMessage"])
        let keepSolving = app.buttons["continueSolving"]
        for _ in 0..<5 where !keepSolving.isHittable { app.swipeUp() }
        keepSolving.tap()
        let field = app.descendants(matching: .any)["answerField"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))

        app.navigationBars["Today"].buttons.firstMatch.tap()
        openTodaysPuzzle(app, until: app.staticTexts["scoreLockedMessage"])

        XCTAssertTrue(field.waitForExistence(timeout: 5), "Reopening the daily should keep the answer field")
        XCTAssertFalse(keepSolving.exists, "Keep solving was already chosen for this puzzle")
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
        // The CTA is hidden from accessibility; the card is the single stop that opens the daily.
        let card = app.buttons["homeTodayCard"]
        XCTAssertTrue(card.waitForExistence(timeout: 15))
        XCTAssertTrue(waitForEnabled(card, timeout: 15))
        for _ in 0..<8 where !card.isHittable { app.swipeUp() }
        XCTAssertTrue(card.isHittable)
        XCTAssertGreaterThanOrEqual(card.frame.height, 44)
        capture("Hub — accessibility XXXL")
        card.tap()
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
