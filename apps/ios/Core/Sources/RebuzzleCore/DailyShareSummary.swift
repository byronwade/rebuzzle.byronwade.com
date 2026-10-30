import Foundation

public enum DailyShareOutcome: String, Equatable, Sendable {
    case solved
    case solvedAfterScoreLock
    case revealed
}

/// The small, answer-blind set of fields permitted in a daily result share.
public struct DailyShareSummary: Equatable, Sendable {
    public static let shareURL = "https://rebuzzle.byronwade.com/?source=share"

    public let puzzleDate: String
    public let outcome: DailyShareOutcome
    /// One slot per allowed attempt. `nil` represents an unused attempt.
    public let attemptMarks: [Bool?]
    public let maximumAttempts: Int
    public let hintsUsed: Int

    public var shareText: String {
        let result: String
        switch outcome {
        case .solved:
            let solvedAt = attemptMarks.firstIndex(of: true).map { $0 + 1 } ?? recordedAttempts
            result = "Solved in \(solvedAt)/\(maximumAttempts)"
        case .solvedAfterScoreLock:
            result = "Solved after the scored round"
        case .revealed:
            result = "The answer was revealed"
        }

        let marks = attemptMarks.map { mark in
            switch mark {
            case .some(true): "🟦"
            case .some(false): "⬜"
            case .none: "▫️"
            }
        }.joined()
        return "Rebuzzle · \(puzzleDate)\n\(result)\n\(marks)\n\(hintsUsed) hint\(hintsUsed == 1 ? "" : "s") used\nCan you find the connection?\n\(Self.shareURL)"
    }

    private var recordedAttempts: Int { attemptMarks.compactMap { $0 }.count }

    init(session: GameSession) {
        puzzleDate = session.puzzleDate
        let maximumAttempts = min(max(session.maxAttempts, 1), 10)
        self.maximumAttempts = maximumAttempts
        hintsUsed = max(0, session.hintsUsed)
        let solvedAfterScoreLock = session.wasSuccessful == true &&
            session.attempts.contains { $0.correct && $0.attemptNumber > maximumAttempts }
        outcome = session.wasSuccessful == true
            ? (solvedAfterScoreLock ? .solvedAfterScoreLock : .solved)
            : .revealed

        var byAttempt: [Int: Bool] = [:]
        for attempt in session.attempts where (1...maximumAttempts).contains(attempt.attemptNumber) {
            if byAttempt[attempt.attemptNumber] == nil {
                byAttempt[attempt.attemptNumber] = attempt.correct
            }
        }
        attemptMarks = (1...maximumAttempts).map { byAttempt[$0] }
    }
}
