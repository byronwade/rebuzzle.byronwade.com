import Foundation

public struct DailyNudgeReveal: Codable, Sendable, Equatable, Identifiable {
    public let hintIndex: Int
    public let afterAttemptCount: Int
    public var id: Int { hintIndex }

    public init(hintIndex: Int, afterAttemptCount: Int) {
        self.hintIndex = hintIndex
        self.afterAttemptCount = afterAttemptCount
    }
}

public enum DailyConversationEntry: Sendable, Identifiable {
    case guess(Guess)
    case nudge(DailyNudgeReveal)

    public var id: String {
        switch self {
        case .guess(let guess): "guess-\(guess.attemptNumber)"
        case .nudge(let reveal): "nudge-\(reveal.hintIndex)"
        }
    }
}

public enum DailyConversationTimeline {
    /// Normalizes local transcript state against the number of clues already revealed.
    /// Older app versions saved only that count, so absent records are placed after the
    /// restored attempts instead of hiding a clue the player has already seen.
    public static func reconcile(
        _ savedReveals: [DailyNudgeReveal],
        revealedHintCount: Int,
        attemptCount: Int
    ) -> [DailyNudgeReveal] {
        let count = max(0, revealedHintCount)
        guard count > 0 else { return [] }
        let lastAttemptPosition = max(0, attemptCount)
        var byHintIndex: [Int: DailyNudgeReveal] = [:]

        for reveal in savedReveals where (0..<count).contains(reveal.hintIndex) {
            guard byHintIndex[reveal.hintIndex] == nil else { continue }
            let position = min(lastAttemptPosition, max(0, reveal.afterAttemptCount))
            byHintIndex[reveal.hintIndex] = DailyNudgeReveal(
                hintIndex: reveal.hintIndex,
                afterAttemptCount: position
            )
        }

        for hintIndex in 0..<count where byHintIndex[hintIndex] == nil {
            byHintIndex[hintIndex] = DailyNudgeReveal(
                hintIndex: hintIndex,
                afterAttemptCount: lastAttemptPosition
            )
        }

        return byHintIndex.values.sorted { $0.hintIndex < $1.hintIndex }
    }

    /// Merges confirmed guesses and nudge reveals into a stable chat-style transcript.
    public static func entries(
        attempts: [Guess],
        reveals: [DailyNudgeReveal]
    ) -> [DailyConversationEntry] {
        let orderedAttempts = attempts.sorted { $0.attemptNumber < $1.attemptNumber }
        let attemptCount = orderedAttempts.count
        var seenHintIndices = Set<Int>()
        let orderedReveals = reveals
            .filter { $0.hintIndex >= 0 && seenHintIndices.insert($0.hintIndex).inserted }
            .map { reveal in
                DailyNudgeReveal(
                    hintIndex: reveal.hintIndex,
                    afterAttemptCount: min(attemptCount, max(0, reveal.afterAttemptCount))
                )
            }
        let revealsAtPosition = Dictionary(grouping: orderedReveals) { $0.afterAttemptCount }

        var entries: [DailyConversationEntry] = []
        for position in 0...attemptCount {
            let nudges = (revealsAtPosition[position] ?? []).sorted { $0.hintIndex < $1.hintIndex }
            entries.append(contentsOf: nudges.map(DailyConversationEntry.nudge))
            if position < attemptCount {
                entries.append(.guess(orderedAttempts[position]))
            }
        }
        return entries
    }
}
