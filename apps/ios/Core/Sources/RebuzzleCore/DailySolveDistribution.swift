import Foundation

public enum DailySolveBucket: String, CaseIterable, Equatable, Sendable, Identifiable {
    case oneGuess
    case twoGuesses
    case threeGuesses
    case fourPlus

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .oneGuess: "1 guess"
        case .twoGuesses: "2 guesses"
        case .threeGuesses: "3 guesses"
        case .fourPlus: "4+ guesses"
        }
    }
}

public struct DailySolveDistribution: Codable, Equatable, Sendable {
    public let available: Bool
    public let minimumSolves: Int
    public let oneGuessPercent: Int
    public let twoGuessesPercent: Int
    public let threeGuessesPercent: Int
    public let fourPlusPercent: Int

    public func percentage(for bucket: DailySolveBucket) -> Int {
        switch bucket {
        case .oneGuess: oneGuessPercent
        case .twoGuesses: twoGuessesPercent
        case .threeGuesses: threeGuessesPercent
        case .fourPlus: fourPlusPercent
        }
    }

    public func bucket(forAttemptNumber attemptNumber: Int) -> DailySolveBucket? {
        guard attemptNumber > 0 else { return nil }
        switch attemptNumber {
        case 1: return .oneGuess
        case 2: return .twoGuesses
        case 3: return .threeGuesses
        default: return .fourPlus
        }
    }
}
