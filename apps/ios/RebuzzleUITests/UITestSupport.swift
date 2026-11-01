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
