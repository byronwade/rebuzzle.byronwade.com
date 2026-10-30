import Foundation
import XCTest
@testable import RebuzzleCore

final class PracticeSessionTests: XCTestCase {
    func testGuessAttemptsAreBoundedAndWrongFeedbackStaysAnswerBlind() throws {
        var session = PracticeSession(puzzleId: "archive-1", hints: [])

        XCTAssertNil(session.submit(guess: "   "))
        XCTAssertEqual(session.submit(guess: " first guess "), 1)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 1, attemptsLeft: 2)))
        XCTAssertNil(session.answer)
        XCTAssertNil(session.explanation)
        XCTAssertEqual(session.guesses.first?.text, "first guess")
        XCTAssertEqual(session.attemptsRemaining, 2)
        XCTAssertEqual(session.roundToken, "signed-round-1")

        XCTAssertEqual(session.submit(guess: "second guess"), 2)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 2, attemptsLeft: 1)))
        XCTAssertEqual(session.submit(guess: "third guess"), 3)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 3, attemptsLeft: 0, gameOver: true)))

        XCTAssertEqual(session.state, .outOfGuesses)
        XCTAssertEqual(session.attemptsRemaining, 0)
        XCTAssertNil(session.submit(guess: "fourth guess"))
        XCTAssertNil(session.answer)
        XCTAssertNil(session.explanation)
    }

    func testCorrectGuessFinishesThePracticeRoundAndShowsSolution() throws {
        var session = PracticeSession(puzzleId: "archive-2", hints: ["Think about the weather."])
        XCTAssertEqual(session.submit(guess: "sunshine"), 1)

        XCTAssertTrue(session.receive(response: try response(
            correct: true,
            attempt: 1,
            attemptsLeft: 0,
            gameOver: true,
            answer: "sunshine",
            explanation: "Sun + shine makes sunshine."
        )))

        XCTAssertEqual(session.state, .solved)
        XCTAssertEqual(session.answer, "sunshine")
        XCTAssertEqual(session.explanation, "Sun + shine makes sunshine.")
        XCTAssertNil(session.submit(guess: "again"))
    }

    func testHintsRevealOneAtATimeAndStopAtThree() {
        var session = PracticeSession(
            puzzleId: "archive-3",
            hints: ["First hint", "Second hint", "Third hint", "Never show this one"]
        )

        XCTAssertEqual(session.revealNextHint(), "First hint")
        XCTAssertEqual(session.revealNextHint(), "Second hint")
        XCTAssertEqual(session.revealedHints, ["First hint", "Second hint"])
        XCTAssertEqual(session.revealNextHint(), "Third hint")
        XCTAssertNil(session.revealNextHint())
        XCTAssertEqual(session.revealedHintCount, 3)
    }

    func testExplicitRevealExposesSolutionOnlyAfterTheRevealAction() throws {
        var session = PracticeSession(puzzleId: "archive-4", hints: [])
        XCTAssertEqual(session.submit(guess: "wrong"), 1)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 1, attemptsLeft: 2)))
        XCTAssertNil(session.answer)

        session.revealSolution(answer: "hidden answer", explanation: "The clue joins two ideas.")

        XCTAssertEqual(session.state, .playing, "A solution reveal is unavailable before all three guesses are used")
        XCTAssertNil(session.answer)
        XCTAssertNil(session.explanation)

        XCTAssertEqual(session.submit(guess: "another wrong guess"), 2)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 2, attemptsLeft: 1)))
        XCTAssertEqual(session.submit(guess: "last wrong guess"), 3)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 3, attemptsLeft: 0, gameOver: true)))
        session.revealSolution(answer: "hidden answer", explanation: "The clue joins two ideas.")

        XCTAssertEqual(session.state, .revealed)
        XCTAssertEqual(session.answer, "hidden answer")
        XCTAssertEqual(session.explanation, "The clue joins two ideas.")
        XCTAssertNil(session.roundToken)
        XCTAssertNil(session.submit(guess: "another guess"))
    }

    func testFailedRequestCanRetryAndReplayResetsOnlyPracticeState() throws {
        var session = PracticeSession(puzzleId: "archive-5", hints: ["One", "Two"])
        XCTAssertEqual(session.submit(guess: "maybe"), 1)
        session.cancelPendingSubmission()
        XCTAssertEqual(session.submit(guess: "maybe again"), 1)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 1, attemptsLeft: 2)))
        XCTAssertEqual(session.revealNextHint(), "One")
        XCTAssertEqual(session.submit(guess: "last try"), 2)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 2, attemptsLeft: 1)))
        XCTAssertEqual(session.submit(guess: "final try"), 3)
        XCTAssertTrue(session.receive(response: try response(correct: false, attempt: 3, attemptsLeft: 0, gameOver: true)))
        session.revealSolution(answer: "answer", explanation: "Explanation")

        session.restartRound()

        XCTAssertEqual(session.state, .playing)
        XCTAssertTrue(session.guesses.isEmpty)
        XCTAssertEqual(session.attemptsRemaining, 3)
        XCTAssertEqual(session.revealedHintCount, 0)
        XCTAssertNil(session.answer)
        XCTAssertNil(session.explanation)
        XCTAssertNil(session.roundToken)
        XCTAssertEqual(session.submit(guess: "fresh attempt"), 1)
    }

    private func response(
        correct: Bool,
        attempt: Int,
        attemptsLeft: Int,
        gameOver: Bool = false,
        answer: String? = nil,
        explanation: String? = nil
    ) throws -> PracticeGuessResponse {
        var json: [String: Any] = [
            "success": true,
            "correct": correct,
            "similarity": correct ? 100 : 20,
            "reaction": ["tier": correct ? "correct" : "cold", "line": "A fresh angle might help."],
            "method": "test",
            "attemptNumber": attempt,
            "attemptsLeft": attemptsLeft,
            "maxAttempts": 3,
            "gameOver": gameOver,
            "locked": gameOver,
            "wordResults": [],
            "isArchive": true,
            "isPractice": true,
            "unscored": true,
        ]
        if let answer { json["answer"] = answer }
        if let explanation { json["explanation"] = explanation }
        if !correct { json["roundToken"] = "signed-round-\(attempt)" }
        return try JSONDecoder().decode(PracticeGuessResponse.self, from: JSONSerialization.data(withJSONObject: json))
    }
}
