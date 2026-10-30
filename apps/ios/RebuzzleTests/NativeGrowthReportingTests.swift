import XCTest
@testable import Rebuzzle
import RebuzzleCore

private func growthPayload(from request: URLRequest) throws -> [String: String] {
    let data: Data
    if let body = request.httpBody {
        data = body
    } else if let stream = request.httpBodyStream {
        stream.open()
        defer { stream.close() }
        var result = Data()
        var buffer = [UInt8](repeating: 0, count: 1024)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count < 0 { throw stream.streamError ?? URLError(.cannotDecodeContentData) }
            if count == 0 { break }
            result.append(buffer, count: count)
        }
        data = result
    } else {
        throw URLError(.cannotDecodeContentData)
    }
    return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: String])
}

private final class GrowthRequestRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var storedPayload: [String: String]?

    func record(_ request: URLRequest) throws {
        let payload = try growthPayload(from: request)
        lock.lock()
        storedPayload = payload
        lock.unlock()
    }

    var payload: [String: String]? {
        lock.lock()
        defer { lock.unlock() }
        return storedPayload
    }
}

@MainActor final class NativeGrowthReportingTests: XCTestCase {
    func testSendsOnlyClosedEventFields() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        var capturedPath: String?
        StubProtocol.responder = { request in
            capturedPath = request.url?.path
            capturedBody = try growthPayload(from: request)
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "device-private", session: URLSession(configuration: config))
        await client.report(.dailyOpened(.app))

        XCTAssertEqual(capturedPath, "/api/native/analytics")
        XCTAssertEqual(Set(capturedBody.keys), Set(["eventType", "source"]))
        XCTAssertEqual(capturedBody["eventType"], "daily_opened")
        XCTAssertEqual(capturedBody["source"], "app")
        XCTAssertNil(capturedBody["userId"])
        XCTAssertNil(capturedBody["puzzleId"])
        XCTAssertNil(capturedBody["answer"])
        XCTAssertNil(capturedBody["guess"])
        XCTAssertNil(capturedBody["metadata"])
    }

    func testPreservesEntrySource() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        StubProtocol.responder = { request in
            capturedBody = try growthPayload(from: request)
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        await client.report(.dailyOpened(.widget))

        XCTAssertEqual(capturedBody, ["eventType": "daily_opened", "source": "widget"])
    }

    func testPlusOfferPayloadsCarryOnlyTheirClosedSourceAndLegacyEventsStaySourceFree() {
        XCTAssertEqual(GrowthEvent.plusOfferViewed(.archive).payload, [
            "eventType": "plus_offer_viewed",
            "source": "archive",
        ])
        XCTAssertEqual(GrowthEvent.plusPurchaseStarted(.settings).payload, [
            "eventType": "plus_purchase_started",
            "source": "settings",
        ])
        XCTAssertEqual(GrowthEvent.plusPurchasePending(.journeyInsights).payload, [
            "eventType": "plus_purchase_pending",
            "source": "journey_insights",
        ])
        XCTAssertEqual(GrowthEvent.plusPurchaseVerified(.freeSample).payload, [
            "eventType": "plus_purchase_verified",
            "source": "free_sample",
        ])
        XCTAssertEqual(GrowthEvent.plusPurchaseFailed(.journal).payload, [
            "eventType": "plus_purchase_failed",
            "source": "journal",
        ])
        XCTAssertEqual(GrowthEvent.plusPurchaseVerified(nil).payload, [
            "eventType": "plus_purchase_verified",
        ])
        XCTAssertEqual(GrowthEvent.plusRestoreCompleted.payload, [
            "eventType": "plus_restore_completed",
        ])
        XCTAssertEqual(GrowthEvent.reminderEnabled.payload, ["eventType": "reminder_enabled"])
    }

    func testQualityFeedbackIncludesPuzzleDateForServerValidation() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        StubProtocol.responder = { request in
            capturedBody = try growthPayload(from: request)
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "private-device", session: URLSession(configuration: config))
        await client.report(.dailyQualityFeedback(.toughButFair, puzzleDate: "2026-10-27"))

        XCTAssertEqual(capturedBody, [
            "eventType": "daily_quality_feedback",
            "rating": "tough_but_fair",
            "puzzleDate": "2026-10-27",
        ])
        XCTAssertNil(capturedBody["userId"])
        XCTAssertNil(capturedBody["puzzleId"])
        XCTAssertNil(capturedBody["answer"])
        XCTAssertNil(capturedBody["guess"])
        XCTAssertNil(capturedBody["metadata"])
    }

    func testShareEventsSendOnlyTheirEventType() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        StubProtocol.responder = { request in
            capturedBody = try growthPayload(from: request)
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "private-device", session: URLSession(configuration: config))
        await client.report(.dailyShareStarted)
        XCTAssertEqual(capturedBody, ["eventType": "daily_share_started"])

        await client.report(.dailyShareCompleted)
        XCTAssertEqual(capturedBody, ["eventType": "daily_share_completed"])
        XCTAssertNil(capturedBody["userId"])
        XCTAssertNil(capturedBody["puzzleId"])
        XCTAssertNil(capturedBody["answer"])
        XCTAssertNil(capturedBody["guess"])
        XCTAssertNil(capturedBody["metadata"])
    }

    func testSolvePulseViewSendsOnlyItsEventType() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        StubProtocol.responder = { request in
            capturedBody = try growthPayload(from: request)
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "private-device", session: URLSession(configuration: config))
        await client.report(.dailySolvePulseViewed)

        XCTAssertEqual(capturedBody, ["eventType": "daily_solve_pulse_viewed"])
        XCTAssertNil(capturedBody["puzzleId"])
        XCTAssertNil(capturedBody["answer"])
    }

    func testCancelledShareDoesNotCreateACompletedEvent() {
        XCTAssertNil(GrowthEvent.dailyShareCompletionEvent(completed: false))
        XCTAssertEqual(
            GrowthEvent.dailyShareCompletionEvent(completed: true)?.payload,
            ["eventType": "daily_share_completed"]
        )
    }

    func testDropsTelemetryFailures() async {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { _ in throw URLError(.notConnectedToInternet) }

        let client = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        await client.report(.plusOfferViewed(.archive))
    }

    func testVerifiedPurchaseEventIncludesStoreKitProofHeader() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        var capturedTransaction: String?
        StubProtocol.responder = { request in
            capturedBody = try growthPayload(from: request)
            capturedTransaction = request.value(forHTTPHeaderField: "X-Rebuzzle-StoreKit-Transaction")
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        client.plusTransactionJWSProvider = { "verified-test-transaction" }
        await client.report(.plusPurchaseVerified(.archive))

        XCTAssertEqual(capturedBody, ["eventType": "plus_purchase_verified", "source": "archive"])
        XCTAssertEqual(capturedTransaction, "verified-test-transaction")
    }

    func testPurchaseStoreEventsUseTheAuthenticatedClosedAnalyticsPath() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let credentials = CredentialStore(service: "test." + UUID().uuidString, inMemory: true)
        try credentials.write("member-token", key: "token")
        defer { try? credentials.write(nil, key: "token") }

        let recorder = GrowthRequestRecorder()
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            if request.url?.path == "/api/native/analytics" { try recorder.record(request) }
            return (200, #"{"success":true}"#)
        }

        let model = AppModel(
            api: APIClient(deviceID: "test-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: credentials
        )
        model.player = try JSONDecoder().decode(
            Player.self,
            from: Data(#"{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}"#.utf8)
        )

        model.purchases.onGrowthEvent?(.plusPurchaseStarted(.settings))
        for _ in 0..<100 where recorder.payload == nil {
            try await Task.sleep(for: .milliseconds(10))
        }

        XCTAssertEqual(recorder.payload, ["eventType": "plus_purchase_started", "source": "settings"])
    }

    func testVerifiedPurchaseReportingWaitsForRestoredAppAccount() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let credentials = CredentialStore(service: "test." + UUID().uuidString, inMemory: true)
        try credentials.write("member-token", key: "token")
        defer { try? credentials.write(nil, key: "token") }

        let recorder = GrowthRequestRecorder()
        var capturedAuthorization: String?
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            if request.url?.path == "/api/native/analytics" {
                capturedAuthorization = request.value(forHTTPHeaderField: "Authorization")
                try recorder.record(request)
            }
            return (200, #"{"success":true}"#)
        }

        let model = AppModel(
            api: APIClient(deviceID: "test-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: credentials
        )
        let report = try XCTUnwrap(model.purchases.onVerifiedPurchase)
        let rejectedBeforeAuthentication = await report(.plusPurchaseVerified(.freeSample), "member-a")
        XCTAssertFalse(rejectedBeforeAuthentication)
        XCTAssertNil(recorder.payload, "A verified event must wait until the app identity is restored.")

        model.player = try JSONDecoder().decode(
            Player.self,
            from: Data(#"{"id":"member-b","username":"Member B","email":"member-b@example.com","isGuest":false}"#.utf8)
        )

        let rejectedForWrongAccount = await report(.plusPurchaseVerified(.freeSample), "member-a")
        XCTAssertFalse(rejectedForWrongAccount)
        XCTAssertNil(recorder.payload, "A verified event must not be attributed to a different signed-in account.")

        model.player = try JSONDecoder().decode(
            Player.self,
            from: Data(#"{"id":"member-a","username":"Member A","email":"member-a@example.com","isGuest":false}"#.utf8)
        )
        let deliveredAfterAuthentication = await report(.plusPurchaseVerified(.freeSample), "member-a")
        XCTAssertTrue(deliveredAfterAuthentication)
        XCTAssertEqual(recorder.payload, ["eventType": "plus_purchase_verified", "source": "free_sample"])
        XCTAssertEqual(capturedAuthorization, "Bearer member-token")
    }

    func testDailyOpenIsReportedAfterSessionRestorationWithTheEntrySource() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let credentials = CredentialStore(service: "test." + UUID().uuidString, inMemory: true)
        try credentials.write("member-token", key: "token")
        try credentials.write("member", key: "identity-kind")
        defer {
            try? credentials.write(nil, key: "token")
            try? credentials.write(nil, key: "device")
            try? credentials.write(nil, key: "identity-kind")
        }

        let recorder = GrowthRequestRecorder()
        let todayResponseGate = DispatchSemaphore(value: 0)
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url?.path {
            case "/api/puzzle/today":
                todayResponseGate.wait()
                return (200, #"{"success":true,"puzzle":{"id":"puzzle-a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-27","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"puzzle-a","puzzleDate":"2026-10-27","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/native/analytics":
                try recorder.record(request)
                return (200, #"{"success":true}"#)
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "test-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: credentials
        )
        let startupLoad = Task { await model.load() }
        for _ in 0..<100 where !model.busy { await Task.yield() }
        XCTAssertTrue(model.busy, "The normal startup load should be in flight before the widget route arrives")
        await model.load(entrySource: .widget)
        todayResponseGate.signal()
        await startupLoad.value
        for _ in 0..<100 where recorder.payload == nil {
            try await Task.sleep(for: .milliseconds(10))
        }

        XCTAssertTrue(model.sessionReady)
        XCTAssertEqual(recorder.payload, ["eventType": "daily_opened", "source": "widget"])
    }
}
