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

public enum DailyShareOutcome: Equatable, Sendable {
    case inProgress
    case solved
    case revealed
}

/// The only game data permitted in a shared daily result.
/// It intentionally contains no puzzle answer, explanation, or typed guesses.
public struct DailyShareSummary: Equatable, Sendable {
    public let puzzleDate: String
    public let outcome: DailyShareOutcome
    public let attemptMarks: [Bool]
    public let maxAttempts: Int
    public let hintsUsed: Int

    public var headline: String {
        switch outcome {
        case .inProgress: "Today's puzzle is waiting"
        case .solved: "Solved in \(attemptMarks.count)/\(maxAttempts)"
        case .revealed: "A good challenge"
        }
    }

    public var text: String {
        let marks = attemptMarks.map { $0 ? "🟦" : "⬜" }.joined()
        return "Rebuzzle · \(puzzleDate)\n\(headline)\n\(marks)\n\(hintsUsed) hint\(hintsUsed == 1 ? "" : "s") used\nCan you find the connection?\nhttps://rebuzzle.byronwade.com"
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
    public var revealedAnswer: String? { gameOver ? answer : nil }
    public var shareSummary: DailyShareSummary {
        let outcome: DailyShareOutcome
        if !gameOver { outcome = .inProgress }
        else if wasSuccessful == true { outcome = .solved }
        else { outcome = .revealed }
        return DailyShareSummary(
            puzzleDate: puzzleDate,
            outcome: outcome,
            attemptMarks: attempts.map(\.correct),
            maxAttempts: maxAttempts,
            hintsUsed: hintsUsed
        )
    }
    public var shareText: String { shareSummary.text }
    public init(puzzleId: String, puzzleDate: String) {
        success = true; self.puzzleId = puzzleId; self.puzzleDate = puzzleDate
        attempts = []; hintsUsed = 0; attemptsLeft = 3; maxAttempts = 3; gameOver = false
    }
    public mutating func apply(_ response: GuessResponse, guess: String) {
        if !attempts.contains(where: { $0.attemptNumber == response.attemptNumber }) {
            attempts.append(Guess(guess: guess, correct: response.correct, attemptNumber: response.attemptNumber, reaction: response.reaction, similarity: response.similarity, wordResults: response.wordResults))
        }
        attemptsLeft = response.attemptsLeft; maxAttempts = response.maxAttempts
        gameOver = response.gameOver; wasSuccessful = response.gameOver ? response.correct : nil
        answer = response.gameOver ? response.answer : nil
        explanation = response.gameOver ? response.explanation : nil
    }
}
