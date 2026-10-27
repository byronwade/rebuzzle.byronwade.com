import XCTest
import RebuzzleCore
@testable import Rebuzzle

private func journeyPayload(xp: Int) -> String {
    let level = xp / 300 + 1
    let levelXP = xp % 300
    return """
    {"asOfPuzzleDate":"2026-10-26","currentWeekStart":"2026-10-26","currentWeekEnd":"2026-11-01","summary":{"totalXP":\(xp),"level":\(level),"xpIntoLevel":\(levelXP),"finishes":7,"solves":5,"firstGuessSolves":2,"unassistedSolves":3,"completedThisWeek":2,"badges":["first-finish","first-guess-solve","three-unassisted-solves","seven-finishes"]},"recentEntries":[],"backfill":{"status":"complete"}}
    """
}

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

private final class CompletionRefreshState: @unchecked Sendable {
    private let lock = NSLock()
    private var didCompletePuzzle = false

    func markCompleted() {
        lock.lock()
        defer { lock.unlock() }
        didCompletePuzzle = true
    }

    var isCompleted: Bool {
        lock.lock()
        defer { lock.unlock() }
        return didCompletePuzzle
    }
}

extension RuntimeTests {
    @MainActor func testFetchesAndCachesJourneySnapshotForTheActiveIdentity() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/progress":
                XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer member-token")
                return (200, journeyPayload(xp: 325))
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: store,
            credentials: secure
        )
        await model.load()
        await model.refreshJourneyProgress()

        XCTAssertTrue(model.sessionReady)
        XCTAssertEqual(model.journeySnapshot?.summary?.totalXP, 325)
        XCTAssertEqual(
            try store.load(JourneyProgressSnapshot.self, key: "journey:member-a")?.summary?.totalXP,
            325
        )
    }

    @MainActor func testProgressFetchFailureDoesNotBlockPuzzleOrJournal() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/progress":
                return (503, #"{"error":"Journey sync is temporarily unavailable."}"#)
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: store,
            credentials: secure
        )
        await model.load()
        await model.refreshJourneyProgress()
        model.journal.record(
            JournalEntry(
                puzzleID: "a",
                puzzleDate: "2026-10-26",
                puzzleType: "rebus",
                clue: "x",
                answer: "private note",
                explanation: "",
                won: false,
                attempts: 3,
                hintsUsed: 0
            )
        )
        model.saveJournal()

        XCTAssertTrue(model.sessionReady)
        XCTAssertNotNil(model.journeySyncError)
        XCTAssertEqual(try store.load(Journal.self, key: "journal:member-a")?.entries.count, 1)
    }

    @MainActor func testCompletedPuzzleRefreshesServerJourneyProgress() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }
        let state = CompletionRefreshState()
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/puzzles/guess":
                state.markCompleted()
                return (200, #"{"success":true,"correct":true,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"attemptNumber":1,"answer":"time","explanation":"The clues point to time."}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: state.isCompleted ? 425 : 300))
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: secure
        )
        await model.load()
        for _ in 0..<100 where model.journeySnapshot?.summary?.totalXP != 300 {
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        XCTAssertEqual(model.journeySnapshot?.summary?.totalXP, 300)

        model.draft = "time"
        await model.submit()
        for _ in 0..<100 where model.journeySnapshot?.summary?.totalXP != 425 {
            try await Task.sleep(nanoseconds: 10_000_000)
        }

        XCTAssertTrue(model.game?.gameOver == true)
        XCTAssertEqual(model.journeySnapshot?.summary?.totalXP, 425)
    }

    @MainActor func testAccountSwitchLoadsOnlyTheNewIdentityJourneyCache() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.save(JSONDecoder().decode(JourneyProgressSnapshot.self, from: Data(journeyPayload(xp: 300).utf8)), key: "journey:alice")
        try store.save(JSONDecoder().decode(JourneyProgressSnapshot.self, from: Data(journeyPayload(xp: 75).utf8)), key: "journey:bob")
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("alice-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/auth/login":
                return (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/progress":
                return (503, #"{"error":"Journey sync is temporarily unavailable."}"#)
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: store,
            credentials: secure
        )
        await model.load()
        XCTAssertEqual(model.journeySnapshot?.summary?.totalXP, 300)

        let didSignIn = await model.signIn(email: "bob@example.com", password: "secret")
        XCTAssertTrue(didSignIn)
        XCTAssertEqual(model.player?.id, "bob")
        XCTAssertEqual(model.journeySnapshot?.summary?.totalXP, 75)
    }

    @MainActor func testGuestUpgradeKeepsIdentityAndRotatesBearerAfterSuccess() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("guest-token", key: "token")
        try secure.write("guest", key: "identity-kind")
        defer { try? secure.write(nil, key: "token"); try? secure.write(nil, key: "device"); try? secure.write(nil, key: "identity-kind") }
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today": return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session": return (200, #"{"authenticated":true,"user":{"id":"guest-a","username":"Guest","email":"guest_token@guest.rebuzzle.local","isGuest":true}}"#)
            case "/api/puzzle/session": return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/auth/guest/upgrade":
                XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer guest-token")
                XCTAssertEqual(request.httpMethod, "POST")
                return (200, #"{"success":true,"token":"member-token","user":{"id":"guest-a","username":"Byron","email":"byron@example.com"}}"#)
            default: return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)), storage: LocalStore(root: root), credentials: secure)
        await model.load()
        XCTAssertTrue(model.sessionReady)
        XCTAssertTrue(model.player?.guest == true)

        let upgraded = await model.upgradeGuestAccount(username: "Byron", email: "byron@example.com", password: "strong-pass")

        XCTAssertTrue(upgraded)
        XCTAssertEqual(model.player?.id, "guest-a")
        XCTAssertFalse(model.player?.guest ?? true)
        XCTAssertEqual(try secure.read("token"), "member-token")
        XCTAssertEqual(try secure.read("identity-kind"), "member")
    }

    @MainActor func testGuestUpgradeFailureLeavesGuestCredentialsUntouched() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("guest-token", key: "token")
        try secure.write("guest", key: "identity-kind")
        defer { try? secure.write(nil, key: "token"); try? secure.write(nil, key: "device"); try? secure.write(nil, key: "identity-kind") }
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today": return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session": return (200, #"{"authenticated":true,"user":{"id":"guest-a","username":"Guest","email":"guest_token@guest.rebuzzle.local","isGuest":true}}"#)
            case "/api/puzzle/session": return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/auth/guest/upgrade": return (503, #"{"error":"Try again later."}"#)
            default: return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)), storage: LocalStore(root: root), credentials: secure)
        await model.load()

        let upgraded = await model.upgradeGuestAccount(username: "Byron", email: "byron@example.com", password: "strong-pass")

        XCTAssertFalse(upgraded)
        XCTAssertTrue(model.player?.guest == true)
        XCTAssertEqual(try secure.read("token"), "guest-token")
        XCTAssertEqual(try secure.read("identity-kind"), "guest")
    }

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

    @MainActor func testConvertedGuestRecoveryKeepsOldBearerForSafeSignInPrompt() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("converted-guest-token", key: "token")
        try secure.write("guest", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let api = APIClient(deviceID: "stable-device", session: URLSession(configuration: config))
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (401, #"{"error":"Authentication required"}"#)
            case "/api/auth/guest/lazy":
                XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer converted-guest-token")
                return (409, #"{"error":"This guest account was upgraded. Sign in to continue."}"#)
            default:
                return (500, #"{"error":"Unexpected request"}"#)
            }
        }

        let model = AppModel(api: api, storage: LocalStore(root: root), credentials: secure)
        await model.load()

        XCTAssertFalse(model.sessionReady)
        XCTAssertEqual(model.error, "This guest account was upgraded. Sign in to continue.")
        XCTAssertEqual(try secure.read("token"), "converted-guest-token")
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

extension RuntimeTests {
    @MainActor func testRequestsAdvertiseVerifiedCanonicalBoardSupport() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let api = APIClient(deviceID: "test", session: URLSession(configuration: config))
        defer { StubProtocol.responder = nil }
        StubProtocol.responder = { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "X-Rebuzzle-Canonical-Board"), "1")
            return (200, #"{"success":true}"#)
        }
        let response: SuccessResponse = try await api.request("/api/puzzle/today")
        XCTAssertTrue(response.success)
    }
}
