import XCTest
@testable import Rebuzzle

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

    func testOfferAndReminderPayloadsContainOnlyTheirEventType() {
        XCTAssertEqual(GrowthEvent.plusOfferViewed.payload, ["eventType": "plus_offer_viewed"])
        XCTAssertEqual(GrowthEvent.reminderEnabled.payload, ["eventType": "reminder_enabled"])
    }

    func testQualityFeedbackSendsOnlyRatingAndEventType() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var capturedBody: [String: String] = [:]
        StubProtocol.responder = { request in
            capturedBody = try growthPayload(from: request)
            return (200, #"{"success":true}"#)
        }

        let client = APIClient(deviceID: "private-device", session: URLSession(configuration: config))
        await client.report(.dailyQualityFeedback(.toughButFair))

        XCTAssertEqual(capturedBody, [
            "eventType": "daily_quality_feedback",
            "rating": "tough_but_fair",
        ])
        XCTAssertNil(capturedBody["userId"])
        XCTAssertNil(capturedBody["puzzleId"])
        XCTAssertNil(capturedBody["answer"])
        XCTAssertNil(capturedBody["guess"])
        XCTAssertNil(capturedBody["metadata"])
    }

    func testDropsTelemetryFailures() async {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { _ in throw URLError(.notConnectedToInternet) }

        let client = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        await client.report(.plusOfferViewed)
    }

    func testDailyOpenIsReportedAfterSessionRestorationWithTheEntrySource() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let credentials = CredentialStore(service: "test." + UUID().uuidString)
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
