import XCTest
@testable import Rebuzzle

final class VisualTests: XCTestCase {
    func testMalformedSVGSelectsEmojiFallback() {
        XCTAssertEqual(PictogramContent.resolve(svg: "<svg><path", fallback: "☀️"), .fallback("☀️"))
    }

    func testStrippedSVGSelectsEmojiFallback() {
        let source = #"<svg><image href="https://example.com/clue.png"/></svg>"#
        XCTAssertEqual(PictogramContent.resolve(svg: source, fallback: "🌳"), .fallback("🌳"))
    }

    func testValidGeometryUsesSanitizedSVG() {
        let source = #"<svg viewBox="0 0 10 10"><script>alert(1)</script><path d="M0 0 L10 10"/></svg>"#
        guard case .svg(let sanitized) = PictogramContent.resolve(svg: source, fallback: "↗️") else {
            return XCTFail("Valid geometry should remain a vector clue")
        }
        XCTAssertTrue(sanitized.contains("M0 0 L10 10"))
        XCTAssertFalse(sanitized.contains("script"))
    }
}
