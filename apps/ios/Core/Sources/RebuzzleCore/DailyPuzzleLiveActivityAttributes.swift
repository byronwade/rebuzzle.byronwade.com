#if os(iOS) && canImport(ActivityKit)
import ActivityKit
import Foundation

/// Spoiler-safe state shared between the Rebuzzle app and its widget extension.
public struct DailyPuzzleLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable, Sendable {
        public enum Phase: String, Codable, Hashable, Sendable {
            case solving
            case scoreLocked
            case solved
            case revealed
        }

        public let scoredGuessesUsed: Int
        public let hintsUsed: Int
        public let phase: Phase

        public init(scoredGuessesUsed: Int, hintsUsed: Int, phase: Phase) {
            self.scoredGuessesUsed = min(3, max(0, scoredGuessesUsed))
            self.hintsUsed = max(0, hintsUsed)
            self.phase = phase
        }
    }

    public let puzzleID: String
    public let puzzleDate: String

    public init(puzzleID: String, puzzleDate: String) {
        self.puzzleID = puzzleID
        self.puzzleDate = puzzleDate
    }
}
#endif
