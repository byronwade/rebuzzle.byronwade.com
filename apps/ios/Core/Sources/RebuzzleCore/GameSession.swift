import Foundation

public struct Guess: Codable, Sendable, Identifiable {
    public let guess: String
    public let correct: Bool
    public let attemptNumber: Int
    public let reaction: GuessReaction?
    public let similarity: Double?
    public let wordResults: [GuessWordResult]?
    public var id: Int { attemptNumber }
    public init(guess: String, correct: Bool, attemptNumber: Int, reaction: GuessReaction? = nil, similarity: Double? = nil, wordResults: [GuessWordResult]? = nil) {
        self.guess = guess; self.correct = correct; self.attemptNumber = attemptNumber
        self.reaction = reaction; self.similarity = similarity; self.wordResults = wordResults
    }
}
public struct GameSession: Codable, Sendable {
    public var success: Bool
    public var puzzleId: String
    public var puzzleDate: String
    public var attempts: [Guess]
    public var hintsUsed: Int
    public var attemptsLeft: Int
    public var maxAttempts: Int
    public var gameOver: Bool
    public var wasSuccessful: Bool?
    public var answer: String?
    public var explanation: String?
    public var phase: String?
    public var scoreLocked: Bool?
    public var playMode: String?
    public var finalizationReason: String?
    public var expiredReview: ExpiredDailyReview?
    public var revealedAnswer: String? { gameOver ? answer : nil }
    public var dailyShareSummary: DailyShareSummary? {
        guard gameOver else { return nil }
        return DailyShareSummary(session: self)
    }
    public var shareText: String {
        dailyShareSummary?.shareText ?? "Rebuzzle · \(puzzleDate)\nToday's puzzle is waiting\nCan you find the connection?\nhttps://rebuzzle.byronwade.com"
    }
    public init(puzzleId: String, puzzleDate: String) {
        success = true; self.puzzleId = puzzleId; self.puzzleDate = puzzleDate
        attempts = []; hintsUsed = 0; attemptsLeft = 3; maxAttempts = 3; gameOver = false
        phase = nil; scoreLocked = nil; playMode = nil; finalizationReason = nil; expiredReview = nil
    }
    public mutating func apply(_ response: GuessResponse, guess: String) {
        if !attempts.contains(where: { $0.attemptNumber == response.attemptNumber }) {
            attempts.append(Guess(guess: guess, correct: response.correct, attemptNumber: response.attemptNumber, reaction: response.reaction, similarity: response.similarity, wordResults: response.wordResults))
        }
        attemptsLeft = response.attemptsLeft; maxAttempts = response.maxAttempts
        gameOver = response.gameOver; wasSuccessful = response.gameOver ? response.correct : nil
        answer = response.gameOver ? response.answer : nil
        explanation = response.gameOver ? response.explanation : nil
        phase = response.phase ?? (response.gameOver ? (response.correct ? "solved" : "exhausted") : "scored")
        scoreLocked = response.scoreLocked ?? (response.phase == "score_locked" || response.phase == "continuing")
        playMode = response.playMode ?? (scoreLocked == true ? "extended" : nil)
    }

    public mutating func applyReveal(_ response: RevealResponse) {
        attempts = response.attempts.sorted { $0.attemptNumber < $1.attemptNumber }
        attemptsLeft = response.attemptsLeft
        maxAttempts = response.maxAttempts
        gameOver = response.gameOver
        wasSuccessful = response.wasSuccessful
        answer = response.gameOver ? response.answer : nil
        explanation = response.gameOver ? response.explanation : nil
        phase = response.phase
        scoreLocked = response.scoreLocked
        playMode = "extended"
        finalizationReason = response.phase == "revealed" ? "revealed" : nil
    }
}
