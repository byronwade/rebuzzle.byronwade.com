import Foundation

public enum DailyStreakFreshness: Equatable, Sendable {
    case syncing
    case fresh
    case unavailable
}

public enum DailyStreakMessage: Equatable, Sendable {
    case syncing
    case unavailable
    case firstStep
    case active
    case solved
    case held
    case milestone(Int)
}

public struct DailyStreakPresentation: Equatable, Sendable {
    public let message: DailyStreakMessage
    public let current: Int?
    public let best: Int?
    public let nextMilestone: Int?

    private static let milestones = [3, 7, 14, 30]

    public static func result(
        wasSolved: Bool,
        stats: PlayerStats?,
        freshness: DailyStreakFreshness,
        celebratesMilestone: Bool
    ) -> Self {
        guard freshness == .fresh else {
            return unavailable(message: freshness == .syncing ? .syncing : .unavailable)
        }
        guard let stats, let current = stats.streak, current >= 0 else {
            return unavailable(message: .unavailable)
        }
        guard !(wasSolved && current == 0) else {
            return unavailable(message: .unavailable)
        }

        let nextMilestone = milestones.first { current < $0 }
        let best = validBest(stats.maxStreak, current: current)
        let message: DailyStreakMessage

        if current == 0 {
            message = .firstStep
        } else if wasSolved, celebratesMilestone, milestones.contains(current) {
            message = .milestone(current)
        } else {
            message = wasSolved ? .solved : .held
        }

        return Self(message: message, current: current, best: best, nextMilestone: nextMilestone)
    }

    public static func journey(stats: PlayerStats?) -> Self {
        guard let stats, let current = stats.streak, current >= 0 else {
            return unavailable(message: stats == nil ? .syncing : .unavailable)
        }

        return Self(
            message: current == 0 ? .firstStep : .active,
            current: current,
            best: validBest(stats.maxStreak, current: current),
            nextMilestone: milestones.first { current < $0 }
        )
    }

    private static func validBest(_ best: Int?, current: Int) -> Int? {
        guard let best, best >= current else { return nil }
        return best
    }

    private static func unavailable(message: DailyStreakMessage) -> Self {
        Self(message: message, current: nil, best: nil, nextMilestone: nil)
    }
}
