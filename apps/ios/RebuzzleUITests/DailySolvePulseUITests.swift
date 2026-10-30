import XCTest
import StoreKitTest

@MainActor final class DailySolvePulseUITests: XCTestCase {
    private var app: XCUIApplication!
    private var store: SKTestSession!

    override func setUp() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        store = try SKTestSession(contentsOf: url)
        store.resetToDefaultState()
        store.disableDialogs = true
        store.clearTransactions()
    }

    override func tearDown() async throws {
        app?.terminate()
        store?.clearTransactions()
        store?.resetToDefaultState()
        store = nil
    }

    func testCollapsedCardDoesNotFetchUntilExpanded() {
        launchFixture()
        submit("lighthouse")

        let disclosure = revealDisclosure()
        XCTAssertEqual(requestCount, "0")
        XCTAssertFalse(app.staticTexts["1 guess"].exists)

        disclosure.tap()
        XCTAssertTrue(app.staticTexts["1 guess"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["1 guess, 15 percent"].exists)
        XCTAssertTrue(app.staticTexts["2 guesses, 25 percent"].exists)
        XCTAssertTrue(app.staticTexts["4+ guesses, 35 percent"].exists)
        XCTAssertEqual(waitForRequestCount("1"), "1")
        XCTAssertTrue(app.staticTexts["You"].exists)
    }

    func testLateSolveHighlightsFourPlusBucket() {
        launchFixture(extraArguments: ["--ui-late-solve"])
        let disclosure = revealDisclosure()
        disclosure.tap()

        XCTAssertTrue(app.staticTexts["4+ guesses"].waitForExistence(timeout: 5))
        let fourPlusRow = app.descendants(matching: .any)["dailySolvePulseBucket_fourPlus"].firstMatch
        XCTAssertTrue(fourPlusRow.exists)
        XCTAssertTrue(fourPlusRow.descendants(matching: .any)["dailySolvePulseSelfMarker"].exists)
    }

    func testSmallSampleExplainsWhyMixIsUnavailable() {
        launchFixture(extraArguments: ["--ui-pulse-unavailable"])
        submit("lighthouse")
        revealDisclosure().tap()

        XCTAssertTrue(app.staticTexts["The mix appears after 20 players solve today’s puzzle."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["1 guess"].exists)
    }

    func testFailedLoadCanRetryWithoutLeavingResult() {
        launchFixture(extraArguments: ["--ui-pulse-fails-once"])
        submit("lighthouse")
        revealDisclosure().tap()

        let retry = app.buttons["dailySolvePulseRetry"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["You found it."].exists)
        XCTAssertEqual(waitForRequestCount("1"), "1")

        retry.tap()
        XCTAssertTrue(app.staticTexts["1 guess"].waitForExistence(timeout: 5))
        XCTAssertEqual(waitForRequestCount("2"), "2")
        XCTAssertTrue(app.staticTexts["You found it."].exists)
    }

    private var requestCount: String? {
        app.staticTexts["fixtureDailySolvePulseRequestCount"].label
    }

    @discardableResult
    private func waitForRequestCount(_ expected: String, timeout: TimeInterval = 5) -> String? {
        let diagnostic = app.staticTexts["fixtureDailySolvePulseRequestCount"]
        let predicate = NSPredicate(format: "label == %@", expected)
        expectation(for: predicate, evaluatedWith: diagnostic)
        waitForExpectations(timeout: timeout)
        return diagnostic.label
    }

    private func revealDisclosure() -> XCUIElement {
        let disclosure = app.buttons["dailySolvePulseDisclosure"]
        XCTAssertTrue(disclosure.waitForExistence(timeout: 5))
        for _ in 0..<8 where !disclosure.isHittable { app.swipeUp() }
        XCTAssertTrue(disclosure.isHittable)
        return disclosure
    }

    private func launchFixture(extraArguments: [String] = []) {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-fixture", "--ui-returning-player", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + extraArguments
        app.launch()
        if extraArguments.contains("--ui-late-solve") {
            XCTAssertTrue(app.staticTexts["lateSolveMessage"].waitForExistence(timeout: 15))
            return
        }
        let submit = app.buttons["checkAnswer"]
        XCTAssertTrue(submit.waitForExistence(timeout: 15))
        XCTAssertTrue(waitForEnabled(submit, timeout: 15))
    }

    private func submit(_ answer: String) {
        let field = app.textFields["answerField"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap()
        field.typeText(answer)
        app.buttons["dismissAnswerKeyboard"].tap()
        app.buttons["checkAnswer"].tap()
        XCTAssertTrue(app.staticTexts["You found it."].waitForExistence(timeout: 15))
    }

    private func waitForEnabled(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let predicate = NSPredicate(format: "isEnabled == true")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: element)
        return XCTWaiter.wait(for: [expectation], timeout: timeout) == .completed
    }
}
