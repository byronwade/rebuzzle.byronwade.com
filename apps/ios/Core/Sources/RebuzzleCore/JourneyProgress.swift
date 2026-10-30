/// A display model mapped only from the server-owned Journey summary.
public struct JourneyProgress: Sendable {
    public struct Badge: Identifiable, Sendable {
        public let id: String
        public let title: String
        public let detail: String
        public let symbol: String
        public let progress: Int
        public let goal: Int
        public let earned: Bool

        public init(
            id: String,
            title: String,
            detail: String,
            symbol: String,
            progress: Int,
            goal: Int,
            earned: Bool
        ) {
            self.id = id
            self.title = title
            self.detail = detail
            self.symbol = symbol
            self.progress = progress
            self.goal = goal
            self.earned = earned
        }
    }

    public let totalXP: Int
    public let level: Int
    public let levelXP: Int
    public let weeklyDays: Int
    public let badges: [Badge]

    public var title: String {
        switch level {
        case 1: "Curious mind"
        case 2...3: "Clue catcher"
        case 4...6: "Pattern finder"
        case 7...10: "Connection maker"
        default: "Aha expert"
        }
    }

    /// Used to preview the current game's reward; account totals still come from the server.
    public static func points(won: Bool, attempts: Int, hintsUsed: Int) -> Int {
        25 + (won ? 75 : 0) + (won && attempts == 1 ? 25 : 0) + (won && hintsUsed == 0 ? 25 : 0)
    }

    public init(summary: JourneyProgressSummary) {
        totalXP = summary.totalXP
        level = summary.level
        levelXP = summary.xpIntoLevel
        weeklyDays = min(summary.completedThisWeek, 3)
        let earnedBadges = Set(summary.badges)
        badges = [
            Badge(
                id: "first-finish",
                title: "First spark",
                detail: "Finish your first puzzle",
                symbol: "sparkles",
                progress: min(summary.finishes, 1),
                goal: 1,
                earned: earnedBadges.contains("first-finish")
            ),
            Badge(
                id: "first-guess-solve",
                title: "Mind reader",
                detail: "Solve in one guess",
                symbol: "scope",
                progress: min(summary.firstGuessSolves, 1),
                goal: 1,
                earned: earnedBadges.contains("first-guess-solve")
            ),
            Badge(
                id: "three-unassisted-solves",
                title: "On a roll",
                detail: "Solve three without hints",
                symbol: "bolt.fill",
                progress: min(summary.unassistedSolves, 3),
                goal: 3,
                earned: earnedBadges.contains("three-unassisted-solves")
            ),
            Badge(
                id: "seven-finishes",
                title: "Seven wonders",
                detail: "Finish seven puzzles",
                symbol: "star.circle.fill",
                progress: min(summary.finishes, 7),
                goal: 7,
                earned: earnedBadges.contains("seven-finishes")
            )
        ]
    }
}
