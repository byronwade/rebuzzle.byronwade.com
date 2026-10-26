import Foundation
import Testing
@testable import RebuzzleCore

private func entry(_ id: String, _ date: String = "2026-10-26", won: Bool = true, attempts: Int = 1, hints: Int = 0) -> JournalEntry {
    JournalEntry(puzzleID: id, puzzleDate: date, puzzleType: "rebus", clue: "clue", answer: "secret", explanation: "explanation", won: won, attempts: attempts, hintsUsed: hints)
}
private var monday: Date { ISO8601DateFormatter().date(from: "2026-10-26T16:00:00Z")! }
private var utc: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(secondsFromGMT: 0)!; return c }

@Test func duplicateRestoreDoesNotAwardMoreXP() {
    let p = JourneyProgress(entries: [entry("a"), entry("a")], now: monday, calendar: utc)
    #expect(p.totalXP == 150)
    #expect(p.level == 1)
    #expect(p.weeklyDays == 1)
}
@Test func completionRewardsAndLevelBoundary() {
    let p = JourneyProgress(entries: [entry("a"), entry("b", "2026-10-25")], now: monday, calendar: utc)
    #expect(p.totalXP == 300)
    #expect(p.level == 2)
    #expect(p.levelXP == 0)
    #expect(JourneyProgress.points(won: false, attempts: 3, hintsUsed: 0) == 25)
    #expect(JourneyProgress.points(won: true, attempts: 2, hintsUsed: 1) == 100)
    #expect(JourneyProgress.points(won: true, attempts: 2, hintsUsed: 0) == 125)
}
@Test func weeklyGoalCountsDistinctDatesAndExcludesFutureAndPreviousWeek() {
    let p = JourneyProgress(entries: [entry("a"), entry("b"), entry("old", "2026-10-25"), entry("future", "2026-10-27")], now: monday, calendar: utc)
    #expect(p.weeklyDays == 1)
    let sunday = ISO8601DateFormatter().date(from: "2026-11-01T23:00:00Z")!
    let week = JourneyProgress(entries: [entry("a"), entry("b", "2026-10-28", won: false), entry("c", "2026-11-01")], now: sunday, calendar: utc)
    #expect(week.weeklyDays == 3)
}
@Test func badgesRequireRealAchievementsAndEmptyIdentityStartsFresh() {
    let p = JourneyProgress(entries: [entry("loss", won: false, attempts: 3)], now: monday, calendar: utc)
    #expect(p.badges.filter(\.earned).map(\.id) == ["first"])
    let empty = JourneyProgress(entries: [], now: monday, calendar: utc)
    #expect(empty.totalXP == 0)
    #expect(empty.level == 1)
    #expect(empty.badges.allSatisfy { !$0.earned })
}
