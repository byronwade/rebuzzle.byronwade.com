import Foundation

public struct JournalEntry: Codable, Sendable, Identifiable, Hashable {
    public var id: String { puzzleID }
    public let puzzleID: String
    public let puzzleDate: String
    public let puzzleType: String
    public let clue: String
    public let answer: String
    public let explanation: String
    public let won: Bool
    public let attempts: Int
    public let hintsUsed: Int?
    public let hints: [String]
    public let visual: PuzzleVisual?
    public var note: String
    private enum CodingKeys: String, CodingKey {
        case puzzleID, puzzleDate, puzzleType, clue, answer, explanation, won, attempts, hintsUsed, hints, visual, note
    }
    public init(puzzleID: String, puzzleDate: String, puzzleType: String, clue: String, answer: String, explanation: String, won: Bool, attempts: Int, hintsUsed: Int?, note: String = "", visual: PuzzleVisual? = nil, hints: [String] = []) {
        self.puzzleID = puzzleID; self.puzzleDate = puzzleDate; self.puzzleType = puzzleType
        self.clue = clue; self.answer = answer; self.explanation = explanation
        self.won = won; self.attempts = attempts; self.hintsUsed = hintsUsed
        self.note = note; self.visual = visual; self.hints = hints
    }
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        puzzleID = try values.decode(String.self, forKey: .puzzleID)
        puzzleDate = try values.decode(String.self, forKey: .puzzleDate)
        puzzleType = try values.decode(String.self, forKey: .puzzleType)
        clue = try values.decode(String.self, forKey: .clue)
        answer = try values.decode(String.self, forKey: .answer)
        explanation = try values.decode(String.self, forKey: .explanation)
        won = try values.decode(Bool.self, forKey: .won)
        attempts = try values.decode(Int.self, forKey: .attempts)
        hintsUsed = try values.decodeIfPresent(Int.self, forKey: .hintsUsed)
        hints = try values.decodeIfPresent([String].self, forKey: .hints) ?? []
        visual = try values.decodeIfPresent(PuzzleVisual.self, forKey: .visual)
        note = try values.decodeIfPresent(String.self, forKey: .note) ?? ""
    }
}
public struct Journal: Codable, Sendable {
    public var version = 1
    public var entries: [JournalEntry] = []
    public init() {}
    public mutating func record(_ entry: JournalEntry) {
        guard !entries.contains(where: { $0.id == entry.id }) else { return }
        entries.append(entry)
        entries.sort { $0.puzzleDate > $1.puzzleDate }
    }
    public var wins: Int { entries.filter(\.won).count }
    public var winRate: Int { entries.isEmpty ? 0 : Int((Double(wins) / Double(entries.count) * 100).rounded()) }
    public var exportText: String {
        "Rebuzzle · Personal journal\n\n" + entries.map {
            let hints = $0.hintsUsed.map { "\($0) hints" } ?? "hints not recorded"
            return "\($0.puzzleDate) · \($0.puzzleType)\n\($0.clue)\nAnswer: \($0.answer)\n\($0.explanation)\n\($0.won ? "Solved" : "Revealed") · \($0.attempts) guesses · \(hints)\nNotes: \($0.note)"
        }.joined(separator: "\n\n")
    }
}
