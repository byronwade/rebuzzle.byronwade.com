import SwiftUI
import Observation
import UserNotifications
import AppIntents

@MainActor @Observable final class ReturnRouter {
    static let shared = ReturnRouter()
    var request: UUID?
    func openPlay() { request = UUID() }
    @discardableResult func open(_ url: URL) -> Bool {
        guard url.scheme == "rebuzzle", url.host == "play", url.path.isEmpty || url.path == "/" else { return false }
        openPlay(); return true
    }
}

final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate, @unchecked Sendable {
    static let shared = NotificationDelegate()
    func install() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        let play = UNNotificationAction(identifier: "PLAY", title: "Play today’s puzzle", options: [.foreground])
        center.setNotificationCategories([UNNotificationCategory(identifier: "REBUZZLE_DAILY", actions: [play], intentIdentifiers: [])])
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard response.notification.request.content.categoryIdentifier == "REBUZZLE_DAILY",
              response.actionIdentifier != UNNotificationDismissActionIdentifier else { return }
        await MainActor.run { ReturnRouter.shared.openPlay() }
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        // Someone already playing does not need a banner interrupting their puzzle.
        []
    }
}

struct PlayTodayIntent: AppIntent {
    static let title: LocalizedStringResource = "Play today’s puzzle"
    static let description = IntentDescription("Open today’s Rebuzzle and find your daily aha.")
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult {
        ReturnRouter.shared.openPlay()
        return .result()
    }
}
struct RebuzzleShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: PlayTodayIntent(), phrases: ["Play today’s puzzle in \(.applicationName)", "Play \(.applicationName)"], shortTitle: "Play today’s puzzle", systemImageName: "puzzlepiece.fill")
    }
}
