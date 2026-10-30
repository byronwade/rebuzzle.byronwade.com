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
@Test func lateSolveShareDoesNotClaimItWasSolvedInThreeGuesses() {
    var session = GameSession(puzzleId: "a", puzzleDate: "2026-10-27")
    session.attempts = [
        Guess(guess: "first", correct: false, attemptNumber: 1),
        Guess(guess: "second", correct: false, attemptNumber: 2),
        Guess(guess: "third", correct: false, attemptNumber: 3),
        Guess(guess: "lighthouse", correct: true, attemptNumber: 4)
    ]
    session.maxAttempts = 3
    session.gameOver = true
    session.wasSuccessful = true
    session.scoreLocked = true
    session.playMode = "extended"
    session.phase = "solved"
    session.answer = "lighthouse"

    #expect(session.shareText.contains("Solved after the scored round"))
    #expect(!session.shareText.contains("Solved in 3/3"))
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
@Test func scoreLockPhaseSurvivesNativeSessionRestore() throws {
    let raw = #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-27","attempts":[{"guess":"idea three","correct":false,"attemptNumber":3}],"hintsUsed":0,"attemptsLeft":0,"maxAttempts":3,"gameOver":false,"playMode":"extended","phase":"score_locked","scoreLocked":true}"#
    let session = try JSONDecoder().decode(GameSession.self, from: Data(raw.utf8))
    let encoded = try JSONEncoder().encode(session)
    let json = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

    #expect(json["phase"] as? String == "score_locked")
    #expect(json["scoreLocked"] as? Bool == true)
    #expect(json["gameOver"] as? Bool == false)
    #expect(session.revealedAnswer == nil)
}
@Test func continuedGuessResponseKeepsScoreLockAndDoesNotExposeAnswer() throws {
    let raw = #"{"success":true,"correct":false,"attemptsLeft":0,"maxAttempts":3,"gameOver":false,"attemptNumber":4,"playMode":"extended","phase":"continuing","scoreLocked":true}"#
    let response = try JSONDecoder().decode(GuessResponse.self, from: Data(raw.utf8))
    let encoded = try JSONEncoder().encode(response)
    let json = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

    #expect(json["phase"] as? String == "continuing")
    #expect(json["scoreLocked"] as? Bool == true)
    #expect(json["answer"] == nil)
}
@Test func expiredAnswerReviewStaysSeparateFromTodaysAnswer() throws {
    let raw = #"{"success":true,"puzzleId":"today","puzzleDate":"2026-10-27","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false,"phase":"scored","scoreLocked":false,"expiredReview":{"puzzleId":"yesterday","puzzleDate":"2026-10-26","answer":"old answer","explanation":"A prior connection."}}"#
    let session = try JSONDecoder().decode(GameSession.self, from: Data(raw.utf8))

    #expect(session.revealedAnswer == nil)
    #expect(session.expiredReview?.answer == "old answer")
    #expect(!session.shareText.contains("old answer"))
}
@Test func answerRevealCompletesWithoutAppendingAFakeGuess() throws {
    let raw = #"{"success":true,"puzzleId":"today","puzzleDate":"2026-10-27","phase":"revealed","scoreLocked":true,"correct":false,"wasSuccessful":false,"gameOver":true,"attempts":[{"guess":"beacon home","correct":false,"attemptNumber":1},{"guess":"ship light","correct":false,"attemptNumber":2},{"guess":"harbor","correct":false,"attemptNumber":3}],"attemptsLeft":0,"maxAttempts":3,"answer":"lighthouse","explanation":"Light + house makes lighthouse.","pointsEarned":0}"#
    let response = try JSONDecoder().decode(RevealResponse.self, from: Data(raw.utf8))
    var session = GameSession(puzzleId: "today", puzzleDate: "2026-10-27")
    session.applyReveal(response)

    #expect(session.gameOver)
    #expect(session.phase == "revealed")
    #expect(session.revealedAnswer == "lighthouse")
    #expect(session.attempts.count == 3)
    #expect(session.attempts.last?.guess == "harbor")
}
@Test func oldAttemptHasNoInventedFeedback() throws {
    let guess = try JSONDecoder().decode(Guess.self, from: Data(#"{"guess":"old","correct":false,"attemptNumber":1}"#.utf8))
    #expect(guess.reaction == nil)
    #expect(guess.wordResults == nil)
}

@Test func explicitMemberRoleOverridesLegacyGuestEmailSuffix() throws {
    let player = try JSONDecoder().decode(Player.self, from: Data(#"{"id":"member","username":"Member","email":"member@guest.rebuzzle.local","isGuest":false}"#.utf8))
    #expect(!player.guest)
}

@Test func legacyPlayerWithoutRoleStillRecognizesSyntheticGuestEmail() throws {
    let player = try JSONDecoder().decode(Player.self, from: Data(#"{"id":"guest","username":"Guest","email":"guest@guest.rebuzzle.local"}"#.utf8))
    #expect(player.guest)
}

@Test func journalPreservesComposedArtworkAndLegacyEntries() throws {
    let legacy = #"{"version":1,"entries":[{"puzzleID":"a","puzzleDate":"2026-10-25","puzzleType":"rebus","clue":"light house","answer":"lighthouse","explanation":"Combine the pictures","won":true,"attempts":1,"hintsUsed":0,"note":"A moment to keep"}]}"#
    let old = try JSONDecoder().decode(Journal.self, from: Data(legacy.utf8))
    #expect(old.entries.first?.visual == nil)
    #expect(old.entries.first?.note == "A moment to keep")
    let artwork = #"{"mode":"composed","layout":"row","unicodeFallback":"💡 + 🏠","layers":[{"kind":"pictogram","svg":"<svg><path d='M0 0L10 10'/></svg>","emojiFallback":"💡"},{"kind":"operator","symbol":"+"}]}"#
    let visual = try JSONDecoder().decode(PuzzleVisual.self, from: Data(artwork.utf8))
    var journal = Journal()
    journal.record(JournalEntry(puzzleID: "new", puzzleDate: "2026-10-26", puzzleType: "rebus", clue: "💡 + 🏠", answer: "lighthouse", explanation: "Combine", won: true, attempts: 1, hintsUsed: 0, visual: visual))
    let restored = try JSONDecoder().decode(Journal.self, from: JSONEncoder().encode(journal))
    #expect(restored.entries.first?.visual?.layers?.first?.svg == "<svg><path d='M0 0L10 10'/></svg>")
    #expect(restored.entries.first?.visual?.layout == "row")
    #expect(restored.entries.first?.visual?.layers?.last?.symbol == "+")
}
