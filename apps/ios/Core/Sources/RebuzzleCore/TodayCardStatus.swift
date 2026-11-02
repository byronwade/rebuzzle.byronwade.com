import Foundation

/// What the Play hub's today card says about the daily, derived from the restored session.
public enum TodayCardStatus: Equatable, Sendable {
    case notStarted(guesses: Int, nudges: Int)
    case inProgress(guessesLeft: Int)
    /// The three scored guesses are spent; the player is still solving for the streak.
    case continuing
    case solved(guesses: Int)
    case revealed

    public init(game: GameSession?, hintCount: Int, hintsShown: Int) {
        let nudges = max(0, hintCount)
        guard let game else {
            self = .notStarted(guesses: 3, nudges: nudges)
            return
        }
        if game.gameOver {
            self = game.wasSuccessful == true
                ? .solved(guesses: game.attempts.first(where: \.correct)?.attemptNumber ?? game.attempts.count)
                : .revealed
        } else if game.scoreLocked == true || game.attemptsLeft == 0 {
            self = .continuing
        } else if game.attempts.isEmpty && hintsShown == 0 {
            self = .notStarted(guesses: game.maxAttempts, nudges: nudges)
        } else {
            self = .inProgress(guessesLeft: game.attemptsLeft)
        }
    }

    public var isFinished: Bool {
        switch self {
        case .solved, .revealed: return true
        case .notStarted, .inProgress, .continuing: return false
        }
    }

    public var buttonTitle: String {
        switch self {
        case .notStarted: return "Play today’s"
        case .inProgress, .continuing: return "Keep going"
        case .solved, .revealed: return "See result"
        }
    }

    public func statusLine(nextPuzzle: Date?, now: Date = Date()) -> String {
        switch self {
        case let .notStarted(guesses, nudges):
            let guessText = Self.count(guesses, "guess", "guesses")
            return nudges > 0 ? "\(guessText) · \(Self.count(nudges, "nudge", "nudges"))" : guessText
        case let .inProgress(guessesLeft):
            return "\(Self.count(guessesLeft, "guess", "guesses")) left"
        case .continuing:
            return "Score saved · keep solving"
        case let .solved(guesses):
            return "Solved in \(guesses) · \(Self.countdown(until: nextPuzzle, now: now))"
        case .revealed:
            return "Answer revealed · \(Self.countdown(until: nextPuzzle, now: now))"
        }
    }

    /// Whole hours while an hour or more remains, then rounded-up minutes, so it never reads "0h".
    public static func countdown(until deadline: Date?, now: Date = Date()) -> String {
        guard let deadline else { return "new puzzle soon" }
        let seconds = DailyReturnTiming.remaining(until: deadline, now: now)
        guard seconds > 0 else { return "new puzzle soon" }
        if seconds >= 3600 { return "new puzzle in \(seconds / 3600)h" }
        return "new puzzle in \((seconds + 59) / 60)m"
    }

    private static func count(_ value: Int, _ singular: String, _ plural: String) -> String {
        "\(value) \(value == 1 ? singular : plural)"
    }
}
