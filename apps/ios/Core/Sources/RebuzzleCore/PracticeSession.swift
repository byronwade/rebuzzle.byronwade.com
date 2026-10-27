import Foundation

public enum PracticeRoundState: Equatable, Sendable {
    case playing
    case solved
    case outOfGuesses
    case revealed
}

/// Read-only archive response. Puzzle contains clue presentation only; answer data is not part of a page.
public struct PuzzleArchivePage: Decodable, Sendable {
    public let items: [Puzzle]
    public let nextCursor: String?
}

/// Answer-blind result from one ephemeral practice request.
public struct PracticeGuessResponse: Decodable, Sendable {
    public let success: Bool
    public let correct: Bool
    public let similarity: Double?
    public let reaction: GuessReaction?
    public let attemptNumber: Int
    public let attemptsLeft: Int
    public let maxAttempts: Int
    public let gameOver: Bool
    public let answer: String?
    public let explanation: String?
    public let wordResults: [GuessWordResult]?
    public let roundToken: String?
}

public struct PracticeRevealResponse: Decodable, Sendable {
    public let success: Bool
    public let puzzleId: String
    public let answer: String
    public let explanation: String
}

public struct PracticeGuess: Sendable, Identifiable {
    public let text: String
    public let correct: Bool
    public let attemptNumber: Int
    public let reaction: GuessReaction?
    public let similarity: Double?
    public let wordResults: [GuessWordResult]?
    public var id: Int { attemptNumber }
}

/// In-memory state for one unscored archive round. It never reads or writes daily gameplay state.
public struct PracticeSession: Sendable {
    public let puzzleId: String
    public let maxAttempts: Int
    private let hints: [String]
    private var pendingGuess: String?

    public private(set) var guesses: [PracticeGuess] = []
    public private(set) var revealedHintCount = 0
    public private(set) var state: PracticeRoundState = .playing
    public private(set) var answer: String?
    public private(set) var explanation: String?
    public private(set) var roundToken: String? = nil

    public init(puzzleId: String, hints: [String], maxAttempts: Int = 3) {
        self.puzzleId = puzzleId
        self.hints = hints
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .prefix(3)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        self.maxAttempts = min(3, max(1, maxAttempts))
        self.pendingGuess = nil
    }

    public var attemptsRemaining: Int { max(0, maxAttempts - guesses.count) }
    public var revealedHints: [String] { Array(hints.prefix(revealedHintCount)) }
    public var canRevealHint: Bool { state == .playing && revealedHintCount < hints.count }
    public var hasPendingSubmission: Bool { pendingGuess != nil }

    /// Reserve the next attempt number without counting it until the server accepts feedback.
    public mutating func submit(guess: String) -> Int? {
        guard state == .playing, pendingGuess == nil, guesses.count < maxAttempts else { return nil }
        let trimmed = guess.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= 200 else { return nil }
        pendingGuess = trimmed
        return guesses.count + 1
    }

    /// Accept an authoritative response for the currently pending practice request.
    @discardableResult
    public mutating func receive(response: PracticeGuessResponse) -> Bool {
        guard
            response.success,
            let submittedGuess = pendingGuess,
            response.attemptNumber == guesses.count + 1,
            response.attemptNumber <= maxAttempts,
            response.maxAttempts == maxAttempts
        else { return false }

        pendingGuess = nil
        roundToken = response.roundToken
        guesses.append(PracticeGuess(
            text: submittedGuess,
            correct: response.correct,
            attemptNumber: response.attemptNumber,
            reaction: response.reaction,
            similarity: response.similarity,
            wordResults: response.wordResults
        ))

        if response.correct {
            state = .solved
            answer = response.answer
            explanation = response.explanation
        } else if response.gameOver || response.attemptsLeft <= 0 {
            state = .outOfGuesses
        }
        return true
    }

    public mutating func cancelPendingSubmission() {
        pendingGuess = nil
    }

    @discardableResult
    public mutating func revealNextHint() -> String? {
        guard canRevealHint else { return nil }
        let hint = hints[revealedHintCount]
        revealedHintCount += 1
        return hint
    }

    public mutating func revealSolution(answer: String? = nil, explanation: String? = nil) {
        guard state == .outOfGuesses else { return }
        pendingGuess = nil
        state = .revealed
        self.answer = answer
        self.explanation = explanation
        roundToken = nil
    }

    public mutating func restartRound() {
        pendingGuess = nil
        guesses = []
        revealedHintCount = 0
        state = .playing
        answer = nil
        explanation = nil
        roundToken = nil
    }
}
