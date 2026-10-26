import Foundation

/// Personal progression derived from confirmed completions, never a second scoring ledger.
public struct JourneyProgress: Sendable {
    public struct Badge: Identifiable, Sendable {
        public let id: String
        public let title: String
        public let detail: String
        public let symbol: String
        public let progress: Int
        public let goal: Int
        public var earned: Bool { progress >= goal }
    }
    public let totalXP: Int
    public let weeklyDays: Int
    public let badges: [Badge]
    public var level: Int { totalXP / 300 + 1 }
    public var levelXP: Int { totalXP % 300 }
    public var title: String {
        switch level {
        case 1: "Curious mind"
        case 2...3: "Clue catcher"
        case 4...6: "Pattern finder"
        case 7...10: "Connection maker"
        default: "Aha expert"
        }
    }
    public static func points(won: Bool, attempts: Int, hintsUsed: Int) -> Int {
        25 + (won ? 75 : 0) + (won && attempts == 1 ? 25 : 0) + (won && hintsUsed == 0 ? 25 : 0)
    }
    public init(entries: [JournalEntry], now: Date = Date(), calendar: Calendar = .current) {
        var seen = Set<String>()
        let unique = entries.filter { seen.insert($0.id).inserted }
        totalXP = unique.reduce(0) { $0 + Self.points(won: $1.won, attempts: $1.attempts, hintsUsed: $1.hintsUsed) }
        var weekCalendar = Calendar(identifier: .gregorian)
        weekCalendar.timeZone = calendar.timeZone
        weekCalendar.firstWeekday = 2
        weekCalendar.minimumDaysInFirstWeek = 4
        let today = weekCalendar.startOfDay(for: now)
        let start = weekCalendar.dateInterval(of: .weekOfYear, for: today)?.start ?? today
        let formatter = DateFormatter()
        formatter.calendar = weekCalendar
        formatter.timeZone = weekCalendar.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        weeklyDays = Set(unique.compactMap { entry -> String? in
            guard let date = formatter.date(from: entry.puzzleDate), date >= start, date <= today else { return nil }
            return formatter.string(from: date)
        }).count
        badges = [
            Badge(id: "first", title: "First spark", detail: "Finish your first puzzle", symbol: "sparkles", progress: min(unique.count, 1), goal: 1),
            Badge(id: "first-try", title: "Mind reader", detail: "Solve in one guess", symbol: "scope", progress: min(unique.filter { $0.won && $0.attempts == 1 }.count, 1), goal: 1),
            Badge(id: "unassisted", title: "On a roll", detail: "Solve three without hints", symbol: "bolt.fill", progress: min(unique.filter { $0.won && $0.hintsUsed == 0 }.count, 3), goal: 3),
            Badge(id: "seven", title: "Seven wonders", detail: "Finish seven puzzles", symbol: "star.circle.fill", progress: min(unique.count, 7), goal: 7)
        ]
    }
}
