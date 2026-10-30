import Foundation

public enum DailyReturnTiming {
    public static func deadline(_ raw: String) -> Date? {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return parser.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
    }
    public static func remaining(until deadline: Date, now: Date = Date()) -> Int {
        max(0, Int(ceil(deadline.timeIntervalSince(now))))
    }
    public static func nextMidnight(after now: Date, calendar: Calendar = .current) -> Date {
        calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now
    }
    public static func reminderDates(hour: Int, minute: Int, completedToday: Bool, now: Date = Date(), calendar: Calendar = .current, days: Int = 60) -> [Date] {
        guard (0...23).contains(hour), (0...59).contains(minute) else { return [] }
        return (0..<min(60, max(0, days))).compactMap { offset in
            guard !(offset == 0 && completedToday),
                  let day = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now)),
                  let fire = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day, matchingPolicy: .nextTime, repeatedTimePolicy: .first),
                  calendar.isDate(day, inSameDayAs: fire), fire > now else { return nil }
            return fire
        }
    }
}
