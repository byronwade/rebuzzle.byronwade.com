#if os(iOS) && canImport(ActivityKit)
import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct DailyRoundActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public let guessesRemaining: Int
        public let isComplete: Bool

        public init(guessesRemaining: Int, isComplete: Bool) {
            self.guessesRemaining = max(0, guessesRemaining)
            self.isComplete = isComplete
        }
    }

    /// Opaque identifier used only to reconcile this activity with the active round.
    public let puzzleID: String
    public let nextPuzzleTime: Date

    public init(puzzleID: String, nextPuzzleTime: Date) {
        self.puzzleID = puzzleID
        self.nextPuzzleTime = nextPuzzleTime
    }
}
#endif
