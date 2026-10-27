import Foundation

public struct DailyResponse: Codable, Sendable {
    public let success: Bool
    public let puzzle: Puzzle
    public let puzzleDate: String
    public let nextPuzzleTime: String
    public let timeZone: String?
}
public struct Puzzle: Codable, Sendable, Identifiable {
    public let id: String
    public let puzzle: String?
    public let rebusPuzzle: String?
    public let puzzleType: String
    public let difficulty: Int
    public let hints: [String]
    public let date: String?
    public let visual: PuzzleVisual?
    enum CodingKeys: String, CodingKey { case id, puzzle, rebusPuzzle, puzzleType, difficulty, hints, date, visual }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        puzzle = try c.decodeIfPresent(String.self, forKey: .puzzle)
        rebusPuzzle = try c.decodeIfPresent(String.self, forKey: .rebusPuzzle)
        puzzleType = try c.decodeIfPresent(String.self, forKey: .puzzleType) ?? "rebus"
        if let number = try? c.decode(Int.self, forKey: .difficulty) { difficulty = min(10, max(1, number)) }
        else {
            let value = (try? c.decode(String.self, forKey: .difficulty))?.lowercased() ?? "medium"
            difficulty = Int(value).map { min(10, max(1, $0)) } ?? ["easy": 3, "medium": 5, "hard": 7, "expert": 9][value] ?? 5
        }
        hints = try c.decodeIfPresent([String].self, forKey: .hints) ?? []
        date = try c.decodeIfPresent(String.self, forKey: .date)
        visual = try c.decodeIfPresent(PuzzleVisual.self, forKey: .visual)
    }
    public var clue: String { puzzle ?? rebusPuzzle ?? visual?.unicodeFallback ?? "" }
    public var typeName: String { puzzleType.replacingOccurrences(of: "-", with: " ").replacingOccurrences(of: "_", with: " ").capitalized }
}
public struct PuzzleVisual: Codable, Sendable, Hashable {
    public let mode: String?
    public let layout: String?
    public let unicodeFallback: String?
    public let layers: [VisualLayer]?
    public let canonicalBoard: CanonicalBoard?
    enum CodingKeys: String, CodingKey { case mode, layout, unicodeFallback, layers, canonicalBoard }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        mode = try c.decodeIfPresent(String.self, forKey: .mode)
        layout = try c.decodeIfPresent(String.self, forKey: .layout)
        unicodeFallback = try c.decodeIfPresent(String.self, forKey: .unicodeFallback)
        layers = try c.decodeIfPresent([VisualLayer].self, forKey: .layers)
        // decodeIfPresent would erase an explicit malformed null artifact.
        canonicalBoard = c.contains(.canonicalBoard) ? try c.decode(CanonicalBoard.self, forKey: .canonicalBoard) : nil
    }
}
public struct VisualLayer: Codable, Sendable, Hashable {
    public let kind: String
    public let content: String?
    public let symbol: String?
    public let emojiFallback: String?
    public let svg: String?
    public let src: String?
    public let alt: String?
    public let emphasis: String?
    public let x: Double?
    public let y: Double?
    public var text: String { content ?? symbol ?? emojiFallback ?? alt ?? "" }
}
public struct Player: Codable, Sendable, Identifiable {
    public let id: String
    public let username: String
    public let email: String?
    public let isGuest: Bool?
    public var guest: Bool { isGuest ?? (email?.hasSuffix("@guest.rebuzzle.local") ?? false) }
}
public struct AuthResponse: Decodable, Sendable {
    public let success: Bool?
    public let authenticated: Bool?
    public let user: Player?
    public let token: String?
}
public struct GuessReaction: Codable, Sendable {
    public let tier: String
    public let line: String
}
public struct GuessWordResult: Codable, Sendable {
    public let word: String
    public let correct: Bool
    public let similarity: Double?
}
public struct GuessResponse: Decodable, Sendable {
    public let success: Bool
    public let correct: Bool
    public let attemptsLeft: Int
    public let maxAttempts: Int
    public let gameOver: Bool
    public let attemptNumber: Int
    public let answer: String?
    public let explanation: String?
    public let reaction: GuessReaction?
    public let similarity: Double?
    public let wordResults: [GuessWordResult]?
    public let pointsEarned: Int?
    public let streak: Int?
}
public struct StatsResponse: Decodable, Sendable {
    public let success: Bool
    public let stats: PlayerStats
}
public struct PlayerStats: Decodable, Sendable {
    public let totalGames: Int?
    public let wins: Int?
    public let streak: Int?
    public let maxStreak: Int?
    public let points: Int?
}
