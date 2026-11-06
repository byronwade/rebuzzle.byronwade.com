import XCTest
@testable import Rebuzzle
@testable import RebuzzleCore

final class DailyResultShareCardTests: XCTestCase {
    @MainActor func testShareArtifactMatchesOnlyTheSummaryItWasRenderedFrom() throws {
        let session = try JSONDecoder().decode(GameSession.self, from: Data(#"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-25","attempts":[{"guess":"private guess","correct":true,"attemptNumber":1}],"hintsUsed":1,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"wasSuccessful":true,"answer":"private answer","explanation":"private explanation"}"#.utf8))
        var nextSession = session
        nextSession.attempts = [
            Guess(guess: "private first guess", correct: false, attemptNumber: 1),
            Guess(guess: "private second guess", correct: true, attemptNumber: 2)
        ]
        nextSession.hintsUsed = 2
        let artifact = try XCTUnwrap(DailyResultShareCardRenderer.render(summary: session.shareSummary))

        XCTAssertTrue(artifact.matches(session.shareSummary))
        XCTAssertFalse(artifact.matches(nextSession.shareSummary))
    }

    @MainActor func testInProgressSessionDoesNotRenderACompletedShareCard() {
        let session = GameSession(puzzleId: "a", puzzleDate: "2026-10-25")

        XCTAssertNil(DailyResultShareCardRenderer.render(summary: session.shareSummary))
    }

    @MainActor func testRenderedShareCardExportsFeedReadyPNG() throws {
        let session = try JSONDecoder().decode(GameSession.self, from: Data(#"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-25","attempts":[{"guess":"private guess","correct":true,"attemptNumber":1}],"hintsUsed":1,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"wasSuccessful":true,"answer":"private answer","explanation":"private explanation"}"#.utf8))

        let artifact = try XCTUnwrap(DailyResultShareCardRenderer.render(summary: session.shareSummary))

        XCTAssertEqual(artifact.previewImage.cgImage?.width, 1080)
        XCTAssertEqual(artifact.previewImage.cgImage?.height, 1350)
        XCTAssertEqual(Array(artifact.payload.imageData.prefix(8)), [137, 80, 78, 71, 13, 10, 26, 10])
        XCTAssertEqual(artifact.payload.fallbackText, session.shareText)
        XCTAssertFalse(artifact.payload.fallbackText.contains("private answer"))

        let attachment = XCTAttachment(image: artifact.previewImage)
        attachment.name = "Rebuzzle daily result share card"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
