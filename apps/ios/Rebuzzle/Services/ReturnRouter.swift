import SwiftUI
import Observation
import UserNotifications
import AppIntents

@MainActor @Observable final class ReturnRouter {
    static let shared = ReturnRouter()
    var request: UUID?
    var entrySource: DailyEntrySource = .app
    func openPlay(source: DailyEntrySource = .app) {
        entrySource = source
        request = UUID()
    }
    @discardableResult func open(_ url: URL) -> Bool {
        if url.scheme == "rebuzzle" {
            guard url.host == "play", url.path.isEmpty || url.path == "/" else { return false }
            let source = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?
                .first(where: { $0.name == "source" })?.value
                .flatMap(DailyEntrySource.init(rawValue:)) ?? .app
            openPlay(source: source)
            return true
        }

        let queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let isCanonicalShare = queryItems.count == 1 &&
            queryItems[0].name == "source" && queryItems[0].value == "share"
        let legacyNames = Set(queryItems.map(\.name))
        let legacySharer = queryItems.first(where: { $0.name == "beat" })?.value?.trimmingCharacters(in: .whitespacesAndNewlines)
        let legacySource = queryItems.first(where: { $0.name == "from" })?.value
        let isLegacyShare = queryItems.count == 2 &&
            legacyNames == Set(["beat", "from"]) &&
            !(legacySharer?.isEmpty ?? true) && legacySource == "share"

        guard url.scheme == "https",
              url.host == "rebuzzle.byronwade.com",
              url.port == nil,
              url.user == nil,
              url.password == nil,
              url.path == "/",
              url.fragment == nil,
              isCanonicalShare || isLegacyShare
        else { return false }

        openPlay(source: .share)
        return true
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
        await MainActor.run { ReturnRouter.shared.openPlay(source: .notification) }
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
        ReturnRouter.shared.openPlay(source: .shortcut)
        return .result()
    }
}
struct RebuzzleShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: PlayTodayIntent(), phrases: ["Play today’s puzzle in \(.applicationName)", "Play \(.applicationName)"], shortTitle: "Play today’s puzzle", systemImageName: "puzzlepiece.fill")
    }
}
