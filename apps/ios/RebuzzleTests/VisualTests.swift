import XCTest
import RebuzzleCore
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

extension VisualTests {
    func testCanonicalPictogramInkFollowsThemeWithoutChangingSemanticColors() {
        let svg = ##"<svg viewBox="0 0 24 24" stroke="#1a1f1c" fill="none"><path d="M0 0L24 24"/><circle cx="3" cy="3" r="2" fill="red"/></svg>"##
        let safe = SVGGeometry.sanitize(svg)
        XCTAssertTrue(safe.contains("stroke=\"currentColor\""))
        XCTAssertTrue(safe.contains("fill=\"none\""))
        XCTAssertTrue(safe.contains("fill=\"red\""))
    }

    @MainActor func testDailyShareCardRendersExactPNGAndSafeTextFallback() throws {
        let summary = try dailyShareSummary(solved: true)
        let png = try XCTUnwrap(DailyResultShareCardRenderer.renderPNG(summary: summary))
        let image = try XCTUnwrap(UIImage(data: png))
        XCTAssertEqual(image.cgImage?.width, 1080)
        XCTAssertEqual(image.cgImage?.height, 1350)
        XCTContext.runActivity(named: "Rendered Rebuzzle result card") { activity in
            let attachment = XCTAttachment(image: image)
            attachment.name = "Rebuzzle share card · 1080×1350"
            attachment.lifetime = .keepAlways
            activity.add(attachment)
        }

        XCTAssertTrue(summary.shareText.contains("Solved in 1/3"))
        XCTAssertFalse(summary.shareText.contains("private-answer"))
        XCTAssertFalse(summary.shareText.contains("private-guess"))
        XCTAssertFalse(summary.shareText.contains("private-explanation"))
    }

    @MainActor func testDailyShareSummaryUsesDistinctCopyForRevealedRun() throws {
        let summary = try dailyShareSummary(solved: false)
        XCTAssertTrue(summary.shareText.contains("The answer was revealed"))
        XCTAssertFalse(summary.shareText.contains("Solved in"))
        XCTAssertFalse(summary.shareText.contains("private-answer"))
    }

    @MainActor func testDailyShareCardRejectsArtifactFromDifferentSummary() throws {
        let current = try dailyShareSummary(solved: true)
        let previous = try dailyShareSummary(solved: false)
        let png = Data([1, 2, 3])

        XCTAssertEqual(
            DailyResultShareCardRenderer.matchingPNG(png, renderedFor: current, current: current),
            png
        )
        XCTAssertNil(
            DailyResultShareCardRenderer.matchingPNG(png, renderedFor: previous, current: current)
        )
        XCTAssertNil(
            DailyResultShareCardRenderer.matchingPNG(png, renderedFor: nil, current: current)
        )
    }

    private func dailyShareSummary(solved: Bool) throws -> DailyShareSummary {
        var session = GameSession(puzzleId: "private-puzzle-id", puzzleDate: "2026-10-27")
        session.attempts = [Guess(guess: "private-guess", correct: solved, attemptNumber: 1)]
        session.maxAttempts = 3
        session.hintsUsed = 1
        session.gameOver = true
        session.wasSuccessful = solved
        session.answer = "private-answer"
        session.explanation = "private-explanation"
        return try XCTUnwrap(session.dailyShareSummary)
    }
}
