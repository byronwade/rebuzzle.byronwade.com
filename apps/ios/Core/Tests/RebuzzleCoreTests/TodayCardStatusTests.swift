import Foundation
import Testing
@testable import RebuzzleCore

@Suite struct TodayCardStatusTests {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    private func session(_ results: [Bool], attemptsLeft: Int? = nil) -> GameSession {
        var game = GameSession(puzzleId: "daily", puzzleDate: "2026-11-01")
        game.attempts = results.enumerated().map { index, correct in
            Guess(guess: "guess \(index + 1)", correct: correct, attemptNumber: index + 1)
        }
        game.attemptsLeft = attemptsLeft ?? max(0, 3 - results.count)
        return game
    }

    @Test func anUntouchedDailyInvitesTheFirstGuess() {
        let status = TodayCardStatus(game: session([]), hintCount: 3, hintsShown: 0)

        #expect(status == .notStarted(guesses: 3, nudges: 3))
        #expect(status.statusLine(nextPuzzle: nil, now: now) == "3 guesses · 3 nudges")
        #expect(status.buttonTitle == "Play today’s")
        #expect(!status.isFinished)
    }

    @Test func aMissingSessionStillReadsAsNotStarted() {
        let status = TodayCardStatus(game: nil, hintCount: 2, hintsShown: 0)

        #expect(status == .notStarted(guesses: 3, nudges: 2))
        #expect(status.statusLine(nextPuzzle: nil, now: now) == "3 guesses · 2 nudges")
    }

    @Test func aPuzzleWithoutHintsOnlyCountsGuesses() {
        let status = TodayCardStatus(game: session([]), hintCount: 0, hintsShown: 0)

        #expect(status.statusLine(nextPuzzle: nil, now: now) == "3 guesses")
    }

    @Test func aWrongGuessCountsDownTheGuessesLeft() {
        let two = TodayCardStatus(game: session([false]), hintCount: 3, hintsShown: 0)
        let one = TodayCardStatus(game: session([false, false]), hintCount: 3, hintsShown: 0)

        #expect(two == .inProgress(guessesLeft: 2))
        #expect(two.statusLine(nextPuzzle: nil, now: now) == "2 guesses left")
        #expect(two.buttonTitle == "Keep going")
        #expect(one.statusLine(nextPuzzle: nil, now: now) == "1 guess left")
    }

    @Test func aNudgeBeforeAnyGuessCountsAsStarted() {
        let status = TodayCardStatus(game: session([]), hintCount: 3, hintsShown: 1)

        #expect(status == .inProgress(guessesLeft: 3))
        #expect(status.buttonTitle == "Keep going")
    }

    @Test func aScoreLockedContinuationNeverShowsZeroGuessesLeft() {
        var game = session([false, false, false], attemptsLeft: 0)
        game.scoreLocked = true
        game.phase = "score_locked"
        let status = TodayCardStatus(game: game, hintCount: 3, hintsShown: 0)

        #expect(status == .continuing)
        #expect(status.statusLine(nextPuzzle: nil, now: now) == "Score saved · keep solving")
        #expect(status.buttonTitle == "Keep going")
        #expect(!status.isFinished)
    }

    @Test func aSolveReportsTheWinningGuessAndTheNextPuzzle() {
        var game = session([false, true], attemptsLeft: 1)
        game.gameOver = true
        game.wasSuccessful = true
        let status = TodayCardStatus(game: game, hintCount: 3, hintsShown: 0)

        #expect(status == .solved(guesses: 2))
        #expect(status.statusLine(nextPuzzle: now.addingTimeInterval(5 * 3600 + 600), now: now) == "Solved in 2 · new puzzle in 5h")
        #expect(status.buttonTitle == "See result")
        #expect(status.isFinished)
    }

    @Test func aLateSolveCountsEveryGuessUpToTheWinningOne() {
        var game = session([false, false, false, true], attemptsLeft: 0)
        game.gameOver = true
        game.wasSuccessful = true
        game.scoreLocked = true

        #expect(TodayCardStatus(game: game, hintCount: 3, hintsShown: 0) == .solved(guesses: 4))
    }

    @Test func runningOutOfGuessesRevealsTheAnswer() {
        var game = session([false, false, false], attemptsLeft: 0)
        game.gameOver = true
        game.wasSuccessful = false
        let status = TodayCardStatus(game: game, hintCount: 3, hintsShown: 0)

        #expect(status == .revealed)
        #expect(status.statusLine(nextPuzzle: now.addingTimeInterval(44 * 60 + 30), now: now) == "Answer revealed · new puzzle in 45m")
        #expect(status.buttonTitle == "See result")
        #expect(status.isFinished)
    }

    @Test func theCountdownNeverReadsZeroHours() {
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(3600), now: now) == "new puzzle in 1h")
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(3599), now: now) == "new puzzle in 60m")
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(30), now: now) == "new puzzle in 1m")
        #expect(TodayCardStatus.countdown(until: now.addingTimeInterval(-1), now: now) == "new puzzle soon")
        #expect(TodayCardStatus.countdown(until: nil, now: now) == "new puzzle soon")
    }
}
