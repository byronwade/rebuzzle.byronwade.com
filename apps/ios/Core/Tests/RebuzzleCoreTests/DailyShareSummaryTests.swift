import Foundation
import Testing
@testable import RebuzzleCore

@Suite("Daily result sharing")
struct DailyShareSummaryTests {
    @Test func solvedSummaryOrdersMarksAndExcludesPrivateSessionData() throws {
        let session = try makeSession(
            puzzleID: "private-puzzle-id",
            attempts: [
                (3, false, "secret third guess"),
                (1, true, "secret first guess"),
                (2, false, "secret second guess"),
                (2, true, "duplicate secret guess"),
            ],
            hintsUsed: 2,
            maxAttempts: 4,
            gameOver: true,
            wasSuccessful: true,
            answer: "private-answer",
            explanation: "private explanation"
        )

        let summary = try #require(session.dailyShareSummary)
        #expect(summary.puzzleDate == "2026-10-27")
        #expect(summary.outcome == .solved)
        #expect(summary.attemptMarks == [true, false, false, nil])
        #expect(summary.maximumAttempts == 4)
        #expect(summary.hintsUsed == 2)
        #expect(DailyShareSummary.shareURL == "https://rebuzzle.byronwade.com/?source=share")
        #expect(summary.shareText.contains(DailyShareSummary.shareURL))
        #expect(summary.shareText.contains("Solved in 1/4"))
        #expect(summary.shareText.contains("2 hints used"))
        #expect(!summary.shareText.contains("private-puzzle-id"))
        #expect(!summary.shareText.contains("secret"))
        #expect(!summary.shareText.contains("private-answer"))
        #expect(!summary.shareText.contains("private explanation"))
    }

    @Test func exhaustedRunUsesEncouragingRevealedOutcomeAndEmptySlots() throws {
        let session = try makeSession(
            attempts: [(3, false, "secret third guess"), (1, false, "secret first guess")],
            hintsUsed: 0,
            maxAttempts: 3,
            gameOver: true,
            wasSuccessful: false,
            answer: "private-answer",
            explanation: "private explanation"
        )

        let summary = try #require(session.dailyShareSummary)
        #expect(summary.outcome == .revealed)
        #expect(summary.attemptMarks == [false, nil, false])
        #expect(summary.shareText.contains("The answer was revealed"))
        #expect(!summary.shareText.contains("private-answer"))
        #expect(!summary.shareText.contains("secret"))
    }

    @Test func lateSolveDoesNotClaimItWasSolvedWithinTheScoredRound() throws {
        let session = try makeSession(
            attempts: [(1, false, "secret first guess"), (2, false, "secret second guess"),
                       (3, false, "secret third guess"), (4, true, "secret late guess")],
            hintsUsed: 1,
            maxAttempts: 3,
            gameOver: true,
            wasSuccessful: true,
            answer: "private-answer",
            explanation: "private explanation"
        )

        let summary = try #require(session.dailyShareSummary)
        #expect(summary.outcome == .solvedAfterScoreLock)
        #expect(summary.shareText.contains("Solved after the scored round"))
        #expect(!summary.shareText.contains("Solved in 3/3"))
        #expect(!summary.shareText.contains("secret late guess"))
    }

    @Test func unfinishedSessionHasNoResultSummaryOrSpoilerInCompatibilityShareText() throws {
        let session = try makeSession(
            attempts: [(1, false, "secret guess")],
            hintsUsed: 1,
            maxAttempts: 3,
            gameOver: false,
            wasSuccessful: nil,
            answer: "private-answer",
            explanation: "private explanation"
        )

        #expect(session.dailyShareSummary == nil)
        #expect(session.shareText.contains("Today's puzzle is waiting"))
        #expect(!session.shareText.contains("secret"))
        #expect(!session.shareText.contains("private-answer"))
        #expect(!session.shareText.contains("private explanation"))
    }

    private func makeSession(
        puzzleID: String = "puzzle-1",
        attempts: [(Int, Bool, String)],
        hintsUsed: Int,
        maxAttempts: Int,
        gameOver: Bool,
        wasSuccessful: Bool?,
        answer: String,
        explanation: String
    ) throws -> GameSession {
        let attemptJSON = attempts.map { number, correct, guess in
            "{\"guess\":\"\(guess)\",\"correct\":\(correct),\"attemptNumber\":\(number)}"
        }.joined(separator: ",")
        let successJSON = wasSuccessful.map(String.init) ?? "null"
        let raw = """
        {"success":true,"puzzleId":"\(puzzleID)","puzzleDate":"2026-10-27","attempts":[\(attemptJSON)],"hintsUsed":\(hintsUsed),"attemptsLeft":0,"maxAttempts":\(maxAttempts),"gameOver":\(gameOver),"wasSuccessful":\(successJSON),"answer":"\(answer)","explanation":"\(explanation)"}
        """
        return try JSONDecoder().decode(GameSession.self, from: Data(raw.utf8))
    }
}
