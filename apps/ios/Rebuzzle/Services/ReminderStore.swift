import Foundation
import Observation
import UserNotifications

@MainActor @Observable final class ReminderStore {
    var enabled = UserDefaults.standard.bool(forKey: "reminderEnabled")
    var hour = UserDefaults.standard.object(forKey: "reminderHour") as? Int ?? 9
    var minute = UserDefaults.standard.integer(forKey: "reminderMinute")
    var message: String?
    private let center = UNUserNotificationCenter.current()
    func configure(enabled: Bool, time: Date, completedToday: Bool) async {
        do {
            if enabled {
                let allowed = try await center.requestAuthorization(options: [.alert, .sound])
                guard allowed else {
                    self.enabled = false
                    UserDefaults.standard.set(false, forKey: "reminderEnabled")
                    try await schedule(completedToday: completedToday)
                    message = "Reminders are off in iOS Settings. You can enable them there."
                    return
                }
            }
            self.enabled = enabled
            hour = Calendar.current.component(.hour, from: time)
            minute = Calendar.current.component(.minute, from: time)
            UserDefaults.standard.set(enabled, forKey: "reminderEnabled")
            UserDefaults.standard.set(hour, forKey: "reminderHour")
            UserDefaults.standard.set(minute, forKey: "reminderMinute")
            try await schedule(completedToday: completedToday)
            message = enabled ? "Reminder saved for your local time." : "Reminders turned off."
        } catch { message = "Could not schedule your reminder. Please try again." }
    }
    func schedule(completedToday: Bool) async throws {
        let old = await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("rebuzzle.daily.") }
        center.removePendingNotificationRequests(withIdentifiers: old.map(\.identifier))
        guard enabled else { return }
        let now = Date(), calendar = Calendar.current
        for day in 0..<30 {
            if day == 0 && completedToday { continue }
            guard let date = calendar.date(byAdding: .day, value: day, to: now),
                  let fire = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: date), fire > now else { continue }
            let content = UNMutableNotificationContent()
            content.title = "A little puzzle. A fresh perspective."
            content.body = "Today’s Rebuzzle is ready when you are."
            content.sound = .default
            let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
            try await center.add(UNNotificationRequest(identifier: "rebuzzle.daily.\(day)", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)))
        }
    }
}
