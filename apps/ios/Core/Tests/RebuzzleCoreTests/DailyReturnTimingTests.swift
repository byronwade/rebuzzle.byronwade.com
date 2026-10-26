import Foundation
import Testing
@testable import RebuzzleCore

struct DailyReturnTimingTests {
    private var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        return c
    }
    @Test func countdownClampsAndParsesServerDates() throws {
        let end = try #require(DailyReturnTiming.deadline("2026-10-27T00:00:00Z"))
        #expect(DailyReturnTiming.deadline("2026-10-27T00:00:00.000Z") == end)
        #expect(DailyReturnTiming.deadline("invalid") == nil)
        #expect(DailyReturnTiming.remaining(until: end, now: end.addingTimeInterval(-3661)) == 3661)
        #expect(DailyReturnTiming.remaining(until: end, now: end.addingTimeInterval(100)) == 0)
    }
    @Test func completedDayAndPastTimesAreSkipped() {
        let now = calendar.date(from: DateComponents(year: 2026, month: 10, day: 26, hour: 8))!
        let dates = DailyReturnTiming.reminderDates(hour: 9, minute: 15, completedToday: true, now: now, calendar: calendar)
        #expect(dates.count == 59)
        #expect(calendar.component(.day, from: dates[0]) == 27)
        #expect(calendar.component(.minute, from: dates[0]) == 15)
        let past = DailyReturnTiming.reminderDates(hour: 7, minute: 0, completedToday: false, now: now, calendar: calendar)
        #expect(past.allSatisfy { $0 > now })
        #expect(calendar.component(.day, from: past[0]) == 27)
    }
    @Test func calendarSchedulingSurvivesDSTAndCapsRequests() {
        let now = calendar.date(from: DateComponents(year: 2026, month: 10, day: 31, hour: 8))!
        let dates = DailyReturnTiming.reminderDates(hour: 9, minute: 0, completedToday: false, now: now, calendar: calendar, days: 100)
        #expect(dates.count == 60)
        #expect(dates.allSatisfy { calendar.component(.hour, from: $0) == 9 })
        #expect(dates[1].timeIntervalSince(dates[0]) == 25 * 3600)
        let spring = calendar.date(from: DateComponents(year: 2026, month: 3, day: 8, hour: 0))!
        #expect(DailyReturnTiming.nextMidnight(after: spring, calendar: calendar).timeIntervalSince(spring) == 23 * 3600)
        let gap = DailyReturnTiming.reminderDates(hour: 2, minute: 30, completedToday: false, now: spring, calendar: calendar, days: 2)
        #expect(gap.count == 2)
        #expect(Set(gap.map { calendar.startOfDay(for: $0) }).count == 2)
    }
}
