import XCTest
import UserNotifications
@testable import Rebuzzle

@MainActor final class ReturnTests: XCTestCase {
    func testOnlyPlayURLRoutesAndEachRequestIsFresh() {
        let router = ReturnRouter()
        XCTAssertFalse(router.open(URL(string: "https://example.com/play")!))
        XCTAssertNil(router.request)
        XCTAssertTrue(router.open(URL(string: "rebuzzle://play")!))
        let first = router.request
        router.openPlay()
        XCTAssertNotEqual(first, router.request)
        XCTAssertFalse(router.open(URL(string: "rebuzzle://delete")!))
    }
    func testNotificationContentIsActionableWithoutSpoilers() {
        let content = ReminderStore.content(for: 2)
        XCTAssertEqual(content.categoryIdentifier, "REBUZZLE_DAILY")
        XCTAssertEqual(content.userInfo["destination"] as? String, "play")
        XCTAssertFalse(content.body.isEmpty)
        XCTAssertNotEqual(content.body, ReminderStore.content(for: 1).body)
    }
    func testEntrySourceFollowsWidgetAndIntentRoutes() {
        let router = ReturnRouter()
        XCTAssertTrue(router.open(URL(string: "rebuzzle://play?source=widget")!))
        XCTAssertEqual(router.entrySource, .widget)
        router.openPlay(source: .notification)
        XCTAssertEqual(router.entrySource, .notification)
        router.openPlay(source: .shortcut)
        XCTAssertEqual(router.entrySource, .shortcut)
        XCTAssertTrue(router.open(URL(string: "rebuzzle://play?source=unknown")!))
        XCTAssertEqual(router.entrySource, .app)
    }
}

@MainActor private final class FakeReminderCenter: ReminderCenter {
    var status: UNAuthorizationStatus = .authorized
    var fail = false
    var requests: [UNNotificationRequest] = []
    func authorization() async -> UNAuthorizationStatus { status }
    func requestAuthorization() async throws -> Bool { status == .authorized }
    func pending() async -> [UNNotificationRequest] { requests }
    func remove(_ ids: [String]) { requests.removeAll { ids.contains($0.identifier) } }
    func add(_ request: UNNotificationRequest) async throws {
        if fail { throw NSError(domain: "schedule", code: 1) }
        requests.append(request)
        await Task.yield()
    }
}
extension ReturnTests {
    func testDeniedOrFailedScheduleNeverClaimsEnabled() async {
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let center = FakeReminderCenter()
        let reminders = ReminderStore(center: center, defaults: defaults)
        center.status = .denied
        await reminders.configure(enabled: true, time: Date(), completedToday: false)
        XCTAssertFalse(reminders.enabled)
        XCTAssertTrue(center.requests.isEmpty)
        center.status = .authorized; center.fail = true
        await reminders.configure(enabled: true, time: Date(), completedToday: false)
        XCTAssertFalse(reminders.enabled)
        XCTAssertNil(reminders.nextReminder)
        XCTAssertTrue(center.requests.isEmpty)
    }
    func testCompletionReschedulesAndDisablingClearsPending() async throws {
        let center = FakeReminderCenter()
        let reminders = ReminderStore(center: center, defaults: UserDefaults(suiteName: UUID().uuidString)!)
        await reminders.configure(enabled: true, time: Date(), completedToday: true)
        XCTAssertTrue(reminders.enabled)
        XCTAssertFalse(center.requests.isEmpty)
        let fire = try XCTUnwrap(reminders.nextReminder)
        XCTAssertFalse(Calendar.current.isDateInToday(fire))
        await reminders.configure(enabled: false, time: Date(), completedToday: false)
        XCTAssertTrue(center.requests.isEmpty)
        XCTAssertNil(reminders.nextReminder)
    }
}

extension ReturnTests {
    func testConcurrentRefreshDoesNotReplaceSaveConfirmationWithOff() async throws {
        let center = FakeReminderCenter()
        let reminders = ReminderStore(center: center, defaults: UserDefaults(suiteName: UUID().uuidString)!)
        let save = Task { await reminders.configure(enabled: true, time: Date(), completedToday: false) }
        while center.requests.isEmpty { await Task.yield() }
        try await reminders.schedule(completedToday: false)
        await save.value
        XCTAssertTrue(reminders.enabled)
        XCTAssertNotNil(reminders.nextReminder)
        XCTAssertTrue(reminders.message?.contains("saved") == true)
        XCTAssertLessThanOrEqual(center.requests.count, 60)
    }
}
