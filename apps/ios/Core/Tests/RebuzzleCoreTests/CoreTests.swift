import Foundation
import Testing
@testable import RebuzzleCore

@Test func activeSessionNeverSharesAnAnswer() throws {
    let session = try JSONDecoder().decode(GameSession.self, from: Data(#"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-25","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false,"answer":"secret"}"#.utf8))
    #expect(session.revealedAnswer == nil)
    #expect(!session.shareText.contains("secret"))
}
@Test func completedResultSharesOnlyPerformance() throws {
    let session = try JSONDecoder().decode(GameSession.self, from: Data(#"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-25","attempts":[{"guess":"lighthouse","correct":true,"attemptNumber":1}],"hintsUsed":1,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"wasSuccessful":true,"answer":"lighthouse","explanation":"light plus house"}"#.utf8))
    #expect(session.revealedAnswer == "lighthouse")
    #expect(session.shareText.contains("1/3"))
    #expect(!session.shareText.contains("lighthouse"))
}
@Test func duplicateCompletionPreservesNotesAndOneEntry() {
    var journal = Journal()
    let entry = JournalEntry(puzzleID: "a", puzzleDate: "2026-10-25", puzzleType: "rebus", clue: "LIGHT HOUSE", answer: "lighthouse", explanation: "", won: true, attempts: 2, hintsUsed: 1)
    journal.record(entry)
    journal.entries[0].note = "A lovely clue"
    journal.record(entry)
    #expect(journal.entries.count == 1)
    #expect(journal.entries[0].note == "A lovely clue")
    #expect(journal.winRate == 100)
}
@Test func journalRoundTripAndExport() throws {
    var journal = Journal()
    journal.record(JournalEntry(puzzleID: "a", puzzleDate: "2026-10-25", puzzleType: "rebus", clue: "x", answer: "y", explanation: "z", won: false, attempts: 3, hintsUsed: 2))
    let restored = try JSONDecoder().decode(Journal.self, from: JSONEncoder().encode(journal))
    #expect(restored.entries.count == 1)
    #expect(restored.winRate == 0)
    #expect(restored.exportText.contains("2026-10-25"))
}
@Test func dailyPayloadDecodesWithoutSolution() throws {
    let payload = try JSONDecoder().decode(DailyResponse.self, from: Data(#"{"success":true,"puzzle":{"id":"a","puzzle":"💡 + 🏠","puzzleType":"rebus","difficulty":5,"hints":["Combine"],"date":"2026-10-25"},"puzzleDate":"2026-10-25","nextPuzzleTime":"2026-10-26T04:00:00.000Z"}"#.utf8))
    #expect(payload.puzzle.clue == "💡 + 🏠")
    #expect(payload.puzzle.hints.count == 1)
}
@Test func legacyDifficultyDoesNotLosePuzzle() throws {
    let raw = #"{"id":"legacy","puzzle":"DAY","puzzleType":"rebus","difficulty":"hard","hints":[]}"#
    let puzzle = try JSONDecoder().decode(Puzzle.self, from: Data(raw.utf8))
    #expect(puzzle.clue == "DAY")
    #expect(puzzle.difficulty == 7)
}
@Test func serverFeedbackSurvivesSessionRoundTripWithoutEnteringShareText() throws {
    let raw = #"{"success":true,"correct":false,"attemptsLeft":2,"maxAttempts":3,"gameOver":false,"attemptNumber":1,"similarity":74,"reaction":{"tier":"close","line":"Right neighbourhood, wrong door."},"wordResults":[{"word":"LIGHT","correct":true,"similarity":100},{"word":"HOME","correct":false,"similarity":60}]}"#
    let response = try JSONDecoder().decode(GuessResponse.self, from: Data(raw.utf8))
    var session = GameSession(puzzleId: "a", puzzleDate: "2026-10-25")
    session.apply(response, guess: "light home")
    let restored = try JSONDecoder().decode(GameSession.self, from: JSONEncoder().encode(session))
    #expect(restored.attempts.first?.reaction?.tier == "close")
    #expect(restored.attempts.first?.wordResults?.first?.word == "LIGHT")
    #expect(restored.attempts.first?.wordResults?.first?.correct == true)
    #expect(!restored.shareText.contains("LIGHT"))
    #expect(restored.revealedAnswer == nil)
}
@Test func oldAttemptHasNoInventedFeedback() throws {
    let guess = try JSONDecoder().decode(Guess.self, from: Data(#"{"guess":"old","correct":false,"attemptNumber":1}"#.utf8))
    #expect(guess.reaction == nil)
    #expect(guess.wordResults == nil)
}
