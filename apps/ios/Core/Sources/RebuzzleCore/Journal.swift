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
    public let hintsUsed: Int
    public var note: String
    public init(puzzleID: String, puzzleDate: String, puzzleType: String, clue: String, answer: String, explanation: String, won: Bool, attempts: Int, hintsUsed: Int, note: String = "") {
        self.puzzleID = puzzleID; self.puzzleDate = puzzleDate; self.puzzleType = puzzleType
        self.clue = clue; self.answer = answer; self.explanation = explanation
        self.won = won; self.attempts = attempts; self.hintsUsed = hintsUsed; self.note = note
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
            "\($0.puzzleDate) · \($0.puzzleType)\n\($0.clue)\nAnswer: \($0.answer)\n\($0.explanation)\n\($0.won ? "Solved" : "Revealed") · \($0.attempts) guesses · \($0.hintsUsed) hints\nNotes: \($0.note)"
        }.joined(separator: "\n\n")
    }
}
