import XCTest
import RebuzzleCore
@testable import Rebuzzle

final class RuntimeTests: XCTestCase {
    func testAPIErrorPreservesStatusAndUsefulMessage() {
        let error = APIError(status: 429, message: "Wait a moment before trying again.")
        XCTAssertEqual(error.status, 429)
        XCTAssertEqual(error.errorDescription, "Wait a moment before trying again.")
    }
    @MainActor func testSessionScopedStorageDoesNotMixAccounts() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)
        try storage.saveDraft("my thought", account: "alice", puzzle: "today")
        XCTAssertEqual(storage.draft(account: "alice", puzzle: "today"), "my thought")
        XCTAssertEqual(storage.draft(account: "bob", puzzle: "today"), "")
    }
}

final class StubProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var responder: ((URLRequest) throws -> (Int, String))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, json) = try Self.responder!(request)
            client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type":"application/json"])!, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data(json.utf8))
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
extension RuntimeTests {
    @MainActor func testExpiredGuestSessionRenewsStableGuestIdentity() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("expired", key: "token")
        try secure.write("guest", key: "identity-kind")
        defer { try? secure.write(nil, key: "token"); try? secure.write(nil, key: "device"); try? secure.write(nil, key: "identity-kind") }
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [StubProtocol.self]
        let api = APIClient(deviceID: "stable-device", session: URLSession(configuration: config))
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today": return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session": return (200, #"{"authenticated":false,"user":null}"#)
            case "/api/auth/guest/lazy": return (200, #"{"success":true,"token":"fresh","user":{"id":"guest-a","username":"Guest","isGuest":true}}"#)
            case "/api/puzzle/session": return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            default: return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(api: api, storage: LocalStore(root: root), credentials: secure)
        await model.load()
        XCTAssertTrue(model.sessionReady)
        XCTAssertEqual(model.player?.id, "guest-a")
        XCTAssertEqual(try secure.read("token"), "fresh")
    }
    @MainActor func testFailedJournalLoadCannotExportPreviousAccount() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.save("corrupt journal", key: "journal:bob")
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        defer { try? secure.write(nil, key: "token"); try? secure.write(nil, key: "device"); try? secure.write(nil, key: "identity-kind") }
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { _ in (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com"}}"#) }
        let model = AppModel(api: APIClient(deviceID: "test", session: URLSession(configuration: config)), storage: store, credentials: secure)
        model.journal.record(JournalEntry(puzzleID: "private", puzzleDate: "2026-10-25", puzzleType: "rebus", clue: "x", answer: "alice-secret", explanation: "", won: true, attempts: 1, hintsUsed: 0))
        _ = await model.signIn(email: "bob@example.com", password: "password")
        XCTAssertFalse(model.journal.exportText.contains("alice-secret"))
        model.saveJournal()
        XCTAssertEqual(try store.load(String.self, key: "journal:bob"), "corrupt journal")
    }
}

extension RuntimeTests {
    @MainActor func testDeletingAccountRemovesDraftsAndHintsButNotOtherAccount() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.saveDraft("private", account: "alice", puzzle: "today")
        try store.save(2, key: "hints:alice:today")
        try store.saveDraft("keep", account: "bob", puzzle: "today")
        try store.removeAccount("alice")
        XCTAssertEqual(store.draft(account: "alice", puzzle: "today"), "")
        XCTAssertNil(try store.load(Int.self, key: "hints:alice:today"))
        XCTAssertEqual(store.draft(account: "bob", puzzle: "today"), "keep")
    }
    func testSVGDisallowsScriptsAndRemoteImages() {
        let source = #"<svg viewBox="0 0 10 10"><script>alert(1)</script><image href="https://tracker.invalid/x"/><path d="M0 0 L10 10" stroke="currentColor"/></svg>"#
        let sanitized = SVGGeometry.sanitize(source)
        XCTAssertFalse(sanitized.contains("script"))
        XCTAssertFalse(sanitized.contains("tracker"))
        XCTAssertTrue(sanitized.contains("M0 0 L10 10"))
    }
}
