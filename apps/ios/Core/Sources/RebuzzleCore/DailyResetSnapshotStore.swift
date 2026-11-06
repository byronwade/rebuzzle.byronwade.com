import Foundation

/// Shares only the server-authoritative daily reset time with the widget extension.
public enum DailyResetSnapshotStore {
    public static let appGroupIdentifier = "group.com.byronwade.rebuzzle"
    private static let resetTimeKey = "daily.nextPuzzleTime.unixSeconds"

    public static var nextPuzzleTime: Date? {
        guard let stored = UserDefaults(suiteName: appGroupIdentifier)?.object(forKey: resetTimeKey) as? NSNumber else {
            return nil
        }
        let seconds = stored.doubleValue
        guard seconds.isFinite, seconds > 0 else { return nil }
        return Date(timeIntervalSince1970: seconds)
    }

    /// Returns true when the shared reset changed enough to warrant a widget reload.
    @discardableResult
    public static func save(nextPuzzleTime rawValue: String) -> Bool {
        guard let date = DailyReturnTiming.deadline(rawValue),
              let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return false }
        let seconds = date.timeIntervalSince1970
        guard seconds.isFinite, seconds > 0 else { return false }

        let previous = (defaults.object(forKey: resetTimeKey) as? NSNumber)?.doubleValue
        defaults.set(seconds, forKey: resetTimeKey)
        return previous.map { abs($0 - seconds) >= 1 } ?? true
    }
}
