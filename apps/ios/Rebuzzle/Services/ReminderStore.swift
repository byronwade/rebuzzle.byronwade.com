import Foundation
import Observation
import UserNotifications
import RebuzzleCore

@MainActor protocol ReminderCenter {
    func authorization() async -> UNAuthorizationStatus
    func requestAuthorization() async throws -> Bool
    func pending() async -> [UNNotificationRequest]
    func remove(_ ids: [String])
    func add(_ request: UNNotificationRequest) async throws
}
@MainActor final class SystemReminderCenter: ReminderCenter {
    private let center = UNUserNotificationCenter.current()
    func authorization() async -> UNAuthorizationStatus { await center.notificationSettings().authorizationStatus }
    func requestAuthorization() async throws -> Bool { try await center.requestAuthorization(options: [.alert, .sound]) }
    func pending() async -> [UNNotificationRequest] { await center.pendingNotificationRequests() }
    func remove(_ ids: [String]) { center.removePendingNotificationRequests(withIdentifiers: ids) }
    func add(_ request: UNNotificationRequest) async throws { try await center.add(request) }
}

@MainActor @Observable final class ReminderStore {
    private(set) var enabled: Bool
    private(set) var hour: Int
    private(set) var minute: Int
    private(set) var authorization: UNAuthorizationStatus = .notDetermined
    private(set) var nextReminder: Date?
    var message: String?
    private let center: any ReminderCenter
    private let defaults: UserDefaults
    private var scheduling: Task<Void, Error>?
    var permissionDenied: Bool { authorization == .denied }
    init(center: any ReminderCenter = SystemReminderCenter(), defaults: UserDefaults = .standard) {
        self.center = center; self.defaults = defaults
        enabled = defaults.bool(forKey: "reminderEnabled")
        hour = defaults.object(forKey: "reminderHour") as? Int ?? 9
        minute = defaults.integer(forKey: "reminderMinute")
    }
    func refreshAuthorization() async {
        authorization = await center.authorization()
        if permissionDenied { nextReminder = nil }
    }
    func configure(enabled: Bool, time: Date, completedToday: Bool) async {
        do {
            if enabled {
                let allowed = try await center.requestAuthorization()
                guard allowed else {
                    self.enabled = false; defaults.set(false, forKey: "reminderEnabled")
                    try await schedule(completedToday: completedToday)
                    message = "Notifications are off. Enable them in iPhone Settings, then save your reminder."
                    return
                }
            }
            self.enabled = enabled
            hour = Calendar.current.component(.hour, from: time)
            minute = Calendar.current.component(.minute, from: time)
            defaults.set(enabled, forKey: "reminderEnabled")
            defaults.set(hour, forKey: "reminderHour")
            defaults.set(minute, forKey: "reminderMinute")
            try await schedule(completedToday: completedToday)
            message = enabled && !permissionDenied ? "Your daily moment is saved. We’ll skip days you finish before reminder time." : "Reminders are off."
        } catch {
            self.enabled = false; defaults.set(false, forKey: "reminderEnabled")
            message = "Your reminder wasn’t saved. Please try again."
        }
    }
    func schedule(completedToday: Bool) async throws {
        let previous = scheduling
        let task = Task { @MainActor in
            _ = try? await previous?.value
            try await replaceSchedule(completedToday: completedToday)
        }
        scheduling = task
        try await task.value
    }
    private func replaceSchedule(completedToday: Bool) async throws {
        let run = UUID()
        await refreshAuthorization()
        let old = await center.pending().filter { $0.identifier.hasPrefix("rebuzzle.daily.") }
        center.remove(old.map(\.identifier))
        guard enabled, [.authorized, .provisional, .ephemeral].contains(authorization) else { nextReminder = nil; return }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let dates = DailyReturnTiming.reminderDates(hour: hour, minute: minute, completedToday: completedToday, calendar: calendar)
        var added: [String] = []
        do {
            for (index, fire) in dates.enumerated() {
                let identifier = "rebuzzle.daily.\(run.uuidString).\(index)"
                var components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
                components.calendar = Calendar(identifier: .gregorian)
                let request = UNNotificationRequest(identifier: identifier, content: Self.content(for: index), trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false))
                try await center.add(request); added.append(identifier)
            }
            nextReminder = dates.first
        } catch {
            center.remove(added)
            nextReminder = nil; message = "Reminders could not be scheduled. Open daily reminders to try again."
            throw error
        }
    }
    static func content(for index: Int) -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        let invitations = [
            ("Your daily aha is waiting", "A few clues. One hidden connection. Take a little puzzle break."),
            ("Small puzzle. Big aha.", "Give your curiosity a minute. Open today’s Rebuzzle."),
            ("Ready for a fresh connection?", "Three guesses, a little help from Eve, and a new puzzle to explore.")
        ]
        let copy = invitations[abs(index % invitations.count)]
        content.title = copy.0; content.body = copy.1
        content.sound = .default; content.categoryIdentifier = "REBUZZLE_DAILY"
        content.threadIdentifier = "rebuzzle-daily"
        content.userInfo = ["destination": "play"]
        return content
    }
}
