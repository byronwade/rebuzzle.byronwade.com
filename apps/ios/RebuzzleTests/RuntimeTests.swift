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

private func requestBodyData(_ request: URLRequest) -> Data? {
    if let body = request.httpBody { return body }
    guard let stream = request.httpBodyStream else { return nil }
    stream.open()
    defer { stream.close() }
    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 1024)
    while stream.hasBytesAvailable {
        let count = stream.read(&buffer, maxLength: buffer.count)
        if count <= 0 { break }
        data.append(buffer, count: count)
    }
    return data
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

    @MainActor func testDailyThoughtStorageIsScopedByAccountAndPuzzle() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)

        try storage.saveDailyThought("Try reading the gaps", account: "alice", puzzle: "today")

        XCTAssertEqual(storage.dailyThought(account: "alice", puzzle: "today"), "Try reading the gaps")
        XCTAssertEqual(storage.dailyThought(account: "bob", puzzle: "today"), "")
        XCTAssertEqual(storage.dailyThought(account: "alice", puzzle: "tomorrow"), "")
        try storage.removeDailyThought(account: "alice", puzzle: "today")
        XCTAssertEqual(storage.dailyThought(account: "alice", puzzle: "today"), "")
        try storage.saveLastDailyPuzzle("today", account: "alice")
        XCTAssertEqual(storage.lastDailyPuzzle(account: "alice"), "today")
        XCTAssertNil(storage.lastDailyPuzzle(account: "bob"))
    }

    func testInMemoryCredentialStorePersistsOnlyWithinItsFixtureInstance() throws {
        let first = CredentialStore(inMemory: true)
        let second = CredentialStore(inMemory: true)
        XCTAssertNil(try first.read("token"))
        try first.write("fixture-token", key: "token")
        XCTAssertEqual(try first.read("token"), "fixture-token")
        XCTAssertNil(try second.read("token"))
        try first.write(nil, key: "token")
        XCTAssertNil(try first.read("token"))
    }
}

@MainActor private final class JournalSyncTestEntitlement {
    var enabled = false
}

private final class JournalSyncRequestRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var writes: [[String: Any]] = []

    func record(_ request: URLRequest) {
        guard request.url?.path == "/api/user/journal/note" else { return }
        let data: Data?
        if let body = request.httpBody {
            data = body
        } else if let stream = request.httpBodyStream {
            stream.open()
            defer { stream.close() }
            var bytes = [UInt8](repeating: 0, count: 1024)
            var body = Data()
            while stream.hasBytesAvailable {
                let count = stream.read(&bytes, maxLength: bytes.count)
                guard count > 0 else { break }
                body.append(bytes, count: count)
            }
            data = body
        } else {
            data = nil
        }
        guard let data,
              let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        lock.lock()
        writes.append(payload)
        lock.unlock()
    }

    var noteWrites: [[String: Any]] {
        lock.lock()
        defer { lock.unlock() }
        return writes
    }
}

private final class JournalSyncRequestLatch: @unchecked Sendable {
    private let condition = NSCondition()
    private var didStart = false

    func signal() {
        condition.lock()
        didStart = true
        condition.broadcast()
        condition.unlock()
    }

    func wait(timeout: TimeInterval) -> Bool {
        condition.lock()
        defer { condition.unlock() }
        let deadline = Date().addingTimeInterval(timeout)
        while !didStart && condition.wait(until: deadline) {}
        return didStart
    }
}

private func journalSyncPage(puzzleID: String, note: String, revision: Int) -> String {
    let encodedNote = (try? JSONEncoder().encode(note)).flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
    return """
    {"success":true,"entries":[{"puzzleId":"\(puzzleID)","puzzleDate":"2026-10-27","puzzleType":"rebus","clue":"☀️ + 🏠","answer":"sunshine","explanation":"Sun + shine.","won":true,"attempts":2,"hintsUsed":0,"visual":null,"hints":[],"note":\(encodedNote),"noteRevision":\(revision)}],"nextCursor":null,"historyStatus":"complete"}
    """
}

@MainActor private func journalSyncTestModel(root: URL, credentials: CredentialStore, entitlement: JournalSyncTestEntitlement) -> AppModel {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StubProtocol.self]
    let client = APIClient(deviceID: "journal-sync-test", session: URLSession(configuration: configuration))
    return AppModel(
        api: client,
        storage: LocalStore(root: root),
        credentials: credentials,
        journalPlusEntitlementProvider: { entitlement.enabled }
    )
}

extension RuntimeTests {
    @MainActor func testJournalSyncMigratesAnExistingDeviceNoteToTheAccount() async throws {
        defer { StubProtocol.responder = nil }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)
        let credentials = CredentialStore(service: "test." + UUID().uuidString)
        try credentials.write("alice-token", key: "token")
        try credentials.write("member", key: "identity-kind")
        defer {
            try? credentials.write(nil, key: "token")
            try? credentials.write(nil, key: "device")
            try? credentials.write(nil, key: "identity-kind")
        }
        var journal = Journal()
        journal.record(JournalEntry(
            puzzleID: "daily-a", puzzleDate: "2026-10-27", puzzleType: "rebus", clue: "☀️ + 🏠",
            answer: "sunshine", explanation: "Sun + shine.", won: true, attempts: 2, hintsUsed: 0, note: "A local aha."
        ))
        try storage.save(journal, key: "journal:alice")
        let recorder = JournalSyncRequestRecorder()
        StubProtocol.responder = { request in
            recorder.record(request)
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"daily-a","puzzle":"☀️ + 🏠","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-27","nextPuzzleTime":"2026-10-28T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"daily-a","puzzleDate":"2026-10-27","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/journal":
                return (200, journalSyncPage(puzzleID: "daily-a", note: "", revision: 0))
            case "/api/user/journal/note":
                return (200, #"{"success":true,"note":"A local aha.","revision":1,"updatedAt":"2026-10-28T01:00:00Z"}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 0))
            default:
                return (404, #"{"success":false,"error":"not found"}"#)
            }
        }

        let entitlement = JournalSyncTestEntitlement()
        entitlement.enabled = true
        let model = journalSyncTestModel(root: root, credentials: credentials, entitlement: entitlement)
        await model.load()

        XCTAssertEqual(model.journal.entries.first?.note, "A local aha.")
        XCTAssertEqual(model.journalSyncStatus, .synced)
        XCTAssertEqual(try storage.load(JournalSyncCheckpoint.self, key: "journal-sync:alice")?.entries["daily-a"]?.revision, 1)
        XCTAssertEqual(recorder.noteWrites.count, 1)
        XCTAssertEqual(recorder.noteWrites.first?["expectedRevision"] as? Int, 0)
        XCTAssertEqual(recorder.noteWrites.first?["note"] as? String, "A local aha.")
    }

    @MainActor func testOfflineJournalSyncKeepsTheLocalFirstEditOnDevice() async throws {
        defer { StubProtocol.responder = nil }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)
        let credentials = CredentialStore(service: "test." + UUID().uuidString)
        try credentials.write("alice-token", key: "token")
        try credentials.write("member", key: "identity-kind")
        defer {
            try? credentials.write(nil, key: "token")
            try? credentials.write(nil, key: "device")
            try? credentials.write(nil, key: "identity-kind")
        }
        var journal = Journal()
        journal.record(JournalEntry(
            puzzleID: "daily-a", puzzleDate: "2026-10-27", puzzleType: "rebus", clue: "☀️ + 🏠",
            answer: "sunshine", explanation: "Sun + shine.", won: true, attempts: 2, hintsUsed: 0
        ))
        try storage.save(journal, key: "journal:alice")
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"daily-a","puzzle":"☀️ + 🏠","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-27","nextPuzzleTime":"2026-10-28T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"daily-a","puzzleDate":"2026-10-27","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 0))
            case "/api/user/journal":
                return (503, #"{"success":false,"error":"offline"}"#)
            default:
                return (404, #"{"success":false,"error":"not found"}"#)
            }
        }

        let entitlement = JournalSyncTestEntitlement()
        let model = journalSyncTestModel(root: root, credentials: credentials, entitlement: entitlement)
        await model.load()
        model.journal.entries[0].note = "Keep this thought offline."
        model.saveJournal()
        entitlement.enabled = true
        await model.syncJournal()

        XCTAssertEqual(model.journal.entries.first?.note, "Keep this thought offline.")
        XCTAssertEqual(try storage.load(Journal.self, key: "journal:alice")?.entries.first?.note, "Keep this thought offline.")
        XCTAssertEqual(model.journalSyncStatus, .offline)

        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/user/journal":
                return (200, journalSyncPage(puzzleID: "daily-a", note: "", revision: 0))
            case "/api/user/journal/note":
                return (200, #"{"success":true,"note":"Keep this thought offline.","revision":1,"updatedAt":"2026-10-28T01:00:00Z"}"#)
            default:
                return (404, #"{"success":false,"error":"not found"}"#)
            }
        }
        await model.retryJournalSyncIfNeeded()
        XCTAssertEqual(model.journalSyncStatus, .synced)
        XCTAssertEqual(try storage.load(JournalSyncCheckpoint.self, key: "journal-sync:alice")?.entries["daily-a"]?.revision, 1)
    }

    @MainActor func testGuestUpgradeKeepsIdentityAndSyncsItsExistingJournalNote() async throws {
        defer { StubProtocol.responder = nil }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)
        let credentials = CredentialStore(service: "test." + UUID().uuidString)
        try credentials.write("guest-token", key: "token")
        try credentials.write("guest", key: "identity-kind")
        defer {
            try? credentials.write(nil, key: "token")
            try? credentials.write(nil, key: "device")
            try? credentials.write(nil, key: "identity-kind")
        }
        var journal = Journal()
        journal.record(JournalEntry(
            puzzleID: "daily-a", puzzleDate: "2026-10-27", puzzleType: "rebus", clue: "☀️ + 🏠",
            answer: "sunshine", explanation: "Sun + shine.", won: true, attempts: 2, hintsUsed: 0, note: "Guest aha."
        ))
        try storage.save(journal, key: "journal:guest-a")
        let recorder = JournalSyncRequestRecorder()
        StubProtocol.responder = { request in
            recorder.record(request)
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"daily-a","puzzle":"☀️ + 🏠","puzzleType":"rebus","difficulty":5,"hints":[]} ,"puzzleDate":"2026-10-27","nextPuzzleTime":"2026-10-28T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"guest-a","username":"Guest","email":"guest-a@guest.rebuzzle.local","isGuest":true}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"daily-a","puzzleDate":"2026-10-27","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/auth/guest/upgrade":
                return (200, #"{"success":true,"token":"member-token","user":{"id":"guest-a","username":"Guest","email":"guest@example.com","isGuest":false}}"#)
            case "/api/user/journal":
                return (200, journalSyncPage(puzzleID: "daily-a", note: "", revision: 0))
            case "/api/user/journal/note":
                return (200, #"{"success":true,"note":"Guest aha.","revision":1,"updatedAt":"2026-10-28T01:00:00Z"}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 0))
            default:
                return (404, #"{"success":false,"error":"not found"}"#)
            }
        }

        let entitlement = JournalSyncTestEntitlement()
        entitlement.enabled = true
        let model = journalSyncTestModel(root: root, credentials: credentials, entitlement: entitlement)
        await model.load()
        XCTAssertTrue(model.player?.guest == true)

        let upgraded = await model.upgradeGuestAccount(
            username: "Guest",
            email: "guest@example.com",
            password: "password"
        )

        XCTAssertTrue(upgraded)
        XCTAssertEqual(model.player?.id, "guest-a")
        XCTAssertFalse(model.player?.guest ?? true)
        XCTAssertEqual(model.journal.entries.first?.note, "Guest aha.")
        XCTAssertEqual(recorder.noteWrites.count, 1)
        XCTAssertEqual(recorder.noteWrites.first?["note"] as? String, "Guest aha.")
    }

    @MainActor func testOldAccountJournalResponseCannotReplaceTheNewAccountJournal() async throws {
        defer { StubProtocol.responder = nil }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let credentials = CredentialStore(service: "test." + UUID().uuidString)
        try credentials.write("alice-token", key: "token")
        try credentials.write("member", key: "identity-kind")
        defer {
            try? credentials.write(nil, key: "token")
            try? credentials.write(nil, key: "device")
            try? credentials.write(nil, key: "identity-kind")
        }
        let latch = JournalSyncRequestLatch()
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"daily-a","puzzle":"☀️ + 🏠","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-27","nextPuzzleTime":"2026-10-28T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/auth/login":
                return (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"daily-a","puzzleDate":"2026-10-27","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/journal":
                if request.value(forHTTPHeaderField: "Authorization") == "Bearer alice-token" {
                    latch.signal()
                    Thread.sleep(forTimeInterval: 1.2)
                    return (200, journalSyncPage(puzzleID: "daily-a", note: "Alice's note", revision: 2))
                }
                return (200, journalSyncPage(puzzleID: "daily-b", note: "Bob's note", revision: 1))
            case "/api/user/progress":
                return (200, journeyPayload(xp: 0))
            default:
                return (404, #"{"success":false,"error":"not found"}"#)
            }
        }

        let entitlement = JournalSyncTestEntitlement()
        let model = journalSyncTestModel(root: root, credentials: credentials, entitlement: entitlement)
        await model.load()
        entitlement.enabled = true
        let staleSync = Task { await model.syncJournal() }
        let journalRequestStarted = await Task.detached { latch.wait(timeout: 2) }.value
        XCTAssertTrue(journalRequestStarted, "The old account request should be in flight before switching accounts.")

        let signedIn = await model.signIn(email: "bob@example.com", password: "password")
        XCTAssertTrue(signedIn)
        XCTAssertEqual(model.player?.id, "bob")
        XCTAssertEqual(model.journal.entries.first?.note, "Bob's note")
        await staleSync.value
        XCTAssertEqual(model.player?.id, "bob")
        XCTAssertEqual(model.journal.entries.first?.note, "Bob's note")
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

private final class NudgeRuntimeState: @unchecked Sendable {
    private let lock = NSLock()
    private var acceptedGuess: Bool
    private var memberBLoggedIn = false
    private let puzzleID: String

    init(acceptedGuess: Bool = false, puzzleID: String = "puzzle-a") {
        self.acceptedGuess = acceptedGuess
        self.puzzleID = puzzleID
    }

    func acceptGuess() {
        lock.lock()
        defer { lock.unlock() }
        acceptedGuess = true
    }

    func markMemberBLogin() {
        lock.lock()
        defer { lock.unlock() }
        memberBLoggedIn = true
    }

    var shouldFailRestoredSession: Bool {
        lock.lock()
        defer { lock.unlock() }
        return memberBLoggedIn
    }

    var sessionPayload: String {
        lock.lock()
        defer { lock.unlock() }
        let attempts = acceptedGuess ? #"[{"guess":"wrong answer","correct":false,"attemptNumber":1}]"# : "[]"
        let attemptsLeft = acceptedGuess ? 2 : 3
        return #"{"success":true,"puzzleId":"\#(puzzleID)","puzzleDate":"2099-01-01","attempts":\#(attempts),"hintsUsed":0,"attemptsLeft":\#(attemptsLeft),"maxAttempts":3,"gameOver":false}"#
    }
}

@MainActor private func makeNudgeTestModel(
    root: URL,
    credentials: CredentialStore,
    state: NudgeRuntimeState,
    nextPuzzleTime: String = "2099-01-02T00:00:00Z",
    puzzleID: String = "puzzle-a"
) -> AppModel {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [StubProtocol.self]
    StubProtocol.responder = { request in
        switch request.url!.path {
        case "/api/puzzle/today":
            let responsePuzzleID = state.shouldFailRestoredSession ? "puzzle-b" : puzzleID
            return (200, #"{"success":true,"puzzle":{"id":"\#(responsePuzzleID)","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":["First hint.","Second hint.","Third hint."]},"puzzleDate":"2099-01-01","nextPuzzleTime":"\#(nextPuzzleTime)"}"#)
        case "/api/auth/session":
            return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
        case "/api/auth/login":
            state.markMemberBLogin()
            return (200, #"{"success":true,"token":"member-b-token","user":{"id":"member-b","username":"Member B","email":"member-b@example.com","isGuest":false}}"#)
        case "/api/puzzle/session":
            if state.shouldFailRestoredSession { return (503, #"{"error":"restore unavailable"}"#) }
            return (200, state.sessionPayload)
        case "/api/puzzles/guess":
            state.acceptGuess()
            return (200, #"{"success":true,"correct":false,"attemptsLeft":2,"maxAttempts":3,"gameOver":false,"attemptNumber":1,"phase":"scored"}"#)
        case "/api/puzzles/reveal":
            return (200, #"{"success":true,"puzzleId":"\#(puzzleID)","puzzleDate":"2099-01-01","phase":"scored","scoreLocked":false,"correct":false,"wasSuccessful":false,"gameOver":true,"attempts":[],"attemptsLeft":3,"maxAttempts":3,"answer":"sunshine","explanation":"sun plus shine","pointsEarned":0}"#)
        default:
            return (200, #"{"success":true,"stats":{}}"#)
        }
    }
    return AppModel(
        api: APIClient(deviceID: "nudge-test-device", session: URLSession(configuration: config)),
        storage: LocalStore(root: root),
        credentials: credentials
    )
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
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":["Read the clue.","Name the pictures.","Join the parts."]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
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
        let journalData = try JSONEncoder().encode(model.journal)
        let journal = try XCTUnwrap(JSONSerialization.jsonObject(with: journalData) as? [String: Any])
        let entries = try XCTUnwrap(journal["entries"] as? [[String: Any]])
        XCTAssertEqual(entries.first?["hints"] as? [String], ["Read the clue.", "Name the pictures.", "Join the parts."])
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
        var statsCalls = 0
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/auth/login":
                return (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                if request.value(forHTTPHeaderField: "Authorization") == "Bearer bob-token" {
                    return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[{"guess":"time","correct":true,"attemptNumber":1}],"hintsUsed":0,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"wasSuccessful":true,"answer":"time","explanation":"The clues point to time."}"#)
                }
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/user/stats":
                statsCalls += 1
                let streak = statsCalls == 1 ? 3 : 7
                return (200, #"{"success":true,"stats":{"totalGames":7,"wins":7,"streak":\#(streak),"maxStreak":7,"points":700}}"#)
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
        XCTAssertEqual(statsCalls, 2, "Signing into another account should load that account's streak stats")
        XCTAssertEqual(model.stats?.streak, 7)
        XCTAssertEqual(model.completedStreakRefreshState, .fresh(puzzleID: "a", celebrates: false))
        let game = try XCTUnwrap(model.game)
        XCTAssertEqual(model.streakPresentation(for: game).message, .solved)
        XCTAssertEqual(model.streakPresentation(for: game).current, 7)
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
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/auth/login":
                return (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com"}}"#)
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"today","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"today","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(api: APIClient(deviceID: "test", session: URLSession(configuration: config)), storage: store, credentials: secure)
        model.journal.record(JournalEntry(puzzleID: "private", puzzleDate: "2026-10-25", puzzleType: "rebus", clue: "x", answer: "alice-secret", explanation: "", won: true, attempts: 1, hintsUsed: 0))
        _ = await model.signIn(email: "bob@example.com", password: "password")
        XCTAssertFalse(model.journal.exportText.contains("alice-secret"))
        model.saveJournal()
        XCTAssertEqual(try store.load(String.self, key: "journal:bob"), "corrupt journal")
    }

    @MainActor func testFailedDailyFetchCannotExportPreviousAccountJournal() async throws {
        defer { StubProtocol.responder = nil }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
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
                if request.value(forHTTPHeaderField: "Authorization") == "Bearer bob-token" {
                    return (503, #"{"error":"Daily puzzle is unavailable."}"#)
                }
                return (200, #"{"success":true,"puzzle":{"id":"today","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/auth/login":
                return (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"today","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(
            api: APIClient(deviceID: "test", session: URLSession(configuration: config)),
            storage: store,
            credentials: secure
        )
        await model.load()
        model.journal.record(JournalEntry(puzzleID: "private", puzzleDate: "2026-10-25", puzzleType: "rebus", clue: "x", answer: "alice-secret", explanation: "", won: true, attempts: 1, hintsUsed: 0))

        let signedIn = await model.signIn(email: "bob@example.com", password: "password")

        XCTAssertFalse(signedIn, "Sign-in should report the daily-puzzle fetch failure.")
        XCTAssertEqual(model.player?.id, "bob")
        XCTAssertFalse(model.journal.exportText.contains("alice-secret"))
    }

    @MainActor func testAccountSwitchResetsSolveClockWhenPuzzleIDIsUnchanged() async throws {
        defer { StubProtocol.responder = nil }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
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
        var bobLoginAt: Date?
        var guessTimeSpentSeconds: Int?
        var guessBodyDescription: String?
        var requestPaths: [String] = []
        StubProtocol.responder = { request in
            let path = request.url!.path
            requestPaths.append(path)
            switch path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"same-daily","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"alice","username":"Alice","email":"alice@example.com","isGuest":false}}"#)
            case "/api/auth/login":
                bobLoginAt = Date()
                return (200, #"{"success":true,"token":"bob-token","user":{"id":"bob","username":"Bob","email":"bob@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"same-daily","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/puzzles/guess":
                let bodyData = requestBodyData(request) ?? Data()
                guessBodyDescription = String(data: bodyData, encoding: .utf8) ?? "non-UTF8 body"
                let body = (try? JSONSerialization.jsonObject(with: bodyData)) as? [String: Any]
                guessTimeSpentSeconds = (body?["timeSpentSeconds"] as? NSNumber)?.intValue
                return (200, #"{"success":true,"correct":false,"attemptsLeft":2,"maxAttempts":3,"gameOver":false,"attemptNumber":1}"#)
            default:
                return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(
            api: APIClient(deviceID: "test", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: secure
        )
        await model.load()
        try await Task.sleep(for: .seconds(3))

        let signedIn = await model.signIn(email: "bob@example.com", password: "password")
        XCTAssertTrue(signedIn)
        XCTAssertEqual(model.daily?.puzzle.id, "same-daily")
        XCTAssertTrue(model.sessionReady)
        XCTAssertEqual(model.game?.puzzleId, "same-daily")
        XCTAssertFalse(model.game?.gameOver ?? true)
        XCTAssertFalse(model.needsReconciliation)
        XCTAssertFalse(model.busy)
        XCTAssertFalse(model.submitting)
        XCTAssertGreaterThan(try XCTUnwrap(DailyReturnTiming.deadline(model.daily!.nextPuzzleTime)).timeIntervalSinceNow, 0)
        model.draft = "a guess"
        await model.submit()

        XCTAssertTrue(requestPaths.contains("/api/puzzles/guess"), "Unexpected requests: \(requestPaths)")
        XCTAssertNotNil(guessTimeSpentSeconds, "Guess body: \(guessBodyDescription ?? "missing")")
        let elapsedSinceLogin = Date().timeIntervalSince(try XCTUnwrap(bobLoginAt))
        let measuredElapsed = try XCTUnwrap(guessTimeSpentSeconds)
        XCTAssertLessThanOrEqual(measuredElapsed, Int(elapsedSinceLogin) + 1)
    }
}

extension RuntimeTests {
    @MainActor func testDeletingAccountRemovesDraftsAndHintsButNotOtherAccount() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.saveDraft("private", account: "alice", puzzle: "today")
        try store.saveDailyThought("private thought", account: "alice", puzzle: "today")
        try store.saveLastDailyPuzzle("today", account: "alice")
        try store.save(2, key: "hints:alice:today")
        try store.saveDraft("keep", account: "bob", puzzle: "today")
        try store.saveDailyThought("keep thought", account: "bob", puzzle: "today")
        try store.saveLastDailyPuzzle("today", account: "bob")
        try store.removeAccount("alice")
        XCTAssertEqual(store.draft(account: "alice", puzzle: "today"), "")
        XCTAssertEqual(store.dailyThought(account: "alice", puzzle: "today"), "")
        XCTAssertNil(store.lastDailyPuzzle(account: "alice"))
        XCTAssertNil(try store.load(Int.self, key: "hints:alice:today"))
        XCTAssertEqual(store.draft(account: "bob", puzzle: "today"), "keep")
        XCTAssertEqual(store.dailyThought(account: "bob", puzzle: "today"), "keep thought")
        XCTAssertEqual(store.lastDailyPuzzle(account: "bob"), "today")
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

private final class DelayedStreakResponseState: @unchecked Sendable {
    let requested = DispatchSemaphore(value: 0)
    let release = DispatchSemaphore(value: 0)
}

extension RuntimeTests {
    @MainActor func testCompletedWinUsesFreshServerStreakForTheResult() async throws {
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
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var statsCalls = 0
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/puzzles/guess":
                return (200, #"{"success":true,"correct":true,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"attemptNumber":1,"answer":"time","explanation":"The clues point to time."}"#)
            case "/api/user/stats":
                statsCalls += 1
                let streak = statsCalls == 1 ? 2 : 3
                return (200, #"{"success":true,"stats":{"totalGames":3,"wins":3,"streak":\#(streak),"maxStreak":\#(streak),"points":300}}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 325))
            default:
                return (200, #"{"success":true}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: secure
        )
        await model.load()
        XCTAssertEqual(model.stats?.streak, 2)
        model.draft = "time"
        await model.submit()

        let game = try XCTUnwrap(model.game)
        XCTAssertTrue(game.gameOver)
        XCTAssertEqual(model.completedStreakRefreshState, .fresh(puzzleID: "a", celebrates: true))
        let presentation = model.streakPresentation(for: game)
        XCTAssertEqual(presentation.message, .milestone(3))
        XCTAssertEqual(presentation.current, 3)
        XCTAssertEqual(presentation.best, 3)
    }

    @MainActor func testFailedCompletionStatsRefreshDoesNotPresentStaleStreak() async throws {
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
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var statsCalls = 0
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/puzzles/guess":
                return (200, #"{"success":true,"correct":false,"attemptsLeft":0,"maxAttempts":3,"gameOver":true,"attemptNumber":3,"answer":"time","explanation":"The clues point to time."}"#)
            case "/api/user/stats":
                statsCalls += 1
                if statsCalls == 2 { return (503, #"{"error":"Streak sync is temporarily unavailable."}"#) }
                if statsCalls > 2 {
                    return (200, #"{"success":true,"stats":{"totalGames":6,"wins":5,"streak":5,"maxStreak":5,"points":500}}"#)
                }
                return (200, #"{"success":true,"stats":{"totalGames":5,"wins":4,"streak":4,"maxStreak":4,"points":400}}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 325))
            default:
                return (200, #"{"success":true}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: secure
        )
        await model.load()
        model.draft = "not time"
        await model.submit()

        let game = try XCTUnwrap(model.game)
        XCTAssertTrue(game.gameOver, "The result remains usable when streak sync fails")
        XCTAssertEqual(model.stats?.streak, 4, "The last server stats remain available to Journey")
        XCTAssertEqual(model.completedStreakRefreshState, .failed(puzzleID: "a"))
        let presentation = model.streakPresentation(for: game)
        XCTAssertEqual(presentation.message, .unavailable)
        XCTAssertNil(presentation.current)
        XCTAssertNil(presentation.best)

        await model.refreshStreakProgress()
        XCTAssertEqual(model.stats?.streak, 5)
        XCTAssertEqual(model.completedStreakRefreshState, .fresh(puzzleID: "a", celebrates: false))
        XCTAssertEqual(model.streakPresentation(for: game).current, 5)
        XCTAssertEqual(model.streakPresentation(for: game).message, .held)
    }

    @MainActor func testRestoredCompletedPuzzleRefreshesWithoutCelebratingAgain() async throws {
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
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[{"guess":"time","correct":true,"attemptNumber":1}],"hintsUsed":0,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"wasSuccessful":true,"answer":"time","explanation":"The clues point to time."}"#)
            case "/api/user/stats":
                return (200, #"{"success":true,"stats":{"totalGames":7,"wins":7,"streak":7,"maxStreak":7,"points":700}}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 725))
            default:
                return (200, #"{"success":true}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: secure
        )
        await model.load()

        let game = try XCTUnwrap(model.game)
        XCTAssertTrue(game.gameOver)
        XCTAssertEqual(model.completedStreakRefreshState, .fresh(puzzleID: "a", celebrates: false))
        let presentation = model.streakPresentation(for: game)
        XCTAssertEqual(presentation.message, .solved)
        XCTAssertEqual(presentation.current, 7)
    }

    @MainActor func testDelayedPriorPuzzleStreakResponseIsDiscarded() async throws {
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
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let delayed = DelayedStreakResponseState()
        var statsCalls = 0
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today":
                return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2026-10-26","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/session":
                return (200, #"{"authenticated":true,"user":{"id":"member-a","username":"Member","email":"member@example.com","isGuest":false}}"#)
            case "/api/puzzle/session":
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2026-10-26","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#)
            case "/api/puzzles/guess":
                return (200, #"{"success":true,"correct":true,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"attemptNumber":1,"answer":"time","explanation":"The clues point to time."}"#)
            case "/api/user/stats":
                statsCalls += 1
                if statsCalls == 1 {
                    return (200, #"{"success":true,"stats":{"totalGames":1,"wins":1,"streak":1,"maxStreak":1,"points":100}}"#)
                }
                delayed.requested.signal()
                _ = delayed.release.wait(timeout: .now() + 8)
                return (200, #"{"success":true,"stats":{"totalGames":2,"wins":2,"streak":2,"maxStreak":2,"points":200}}"#)
            case "/api/user/progress":
                return (200, journeyPayload(xp: 125))
            default:
                return (200, #"{"success":true}"#)
            }
        }

        let model = AppModel(
            api: APIClient(deviceID: "stable-device", session: URLSession(configuration: config)),
            storage: LocalStore(root: root),
            credentials: secure
        )
        await model.load()
        model.draft = "time"
        let submission = Task { await model.submit() }
        let requestStarted: Bool = await withCheckedContinuation { continuation in
            DispatchQueue.global().async {
                continuation.resume(returning: delayed.requested.wait(timeout: .now() + 5) == .success)
            }
        }
        XCTAssertTrue(requestStarted, "The terminal result should trigger a fresh stats request")
        guard requestStarted else {
            delayed.release.signal()
            await submission.value
            return
        }

        let completedGame = try XCTUnwrap(model.game)
        XCTAssertEqual(model.streakPresentation(for: completedGame).message, .syncing)
        XCTAssertNil(model.streakPresentation(for: completedGame).current)
        model.game = GameSession(puzzleId: "b", puzzleDate: "2026-10-27")
        delayed.release.signal()
        await submission.value

        XCTAssertEqual(model.stats?.streak, 1)
        let nextPuzzle = try XCTUnwrap(model.game)
        XCTAssertEqual(model.streakPresentation(for: nextPuzzle).message, .syncing)
        XCTAssertNil(model.streakPresentation(for: nextPuzzle).current)
    }

    @MainActor func testNudgesPersistAtTheirConversationPositionsAcrossReload() async throws {
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
        let state = NudgeRuntimeState()
        let store = LocalStore(root: root)
        let firstModel = makeNudgeTestModel(root: root, credentials: secure, state: state)

        await firstModel.load()
        XCTAssertTrue(firstModel.sessionReady)
        firstModel.revealHint()
        firstModel.draft = "wrong answer"
        await firstModel.submit()
        firstModel.revealHint()

        let expected = [
            DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0),
            DailyNudgeReveal(hintIndex: 1, afterAttemptCount: 1),
        ]
        XCTAssertEqual(firstModel.nudgeReveals, expected)
        XCTAssertEqual(
            try store.load([DailyNudgeReveal].self, key: "nudge-turns:member-a:puzzle-a"),
            expected
        )

        let relaunchedModel = makeNudgeTestModel(root: root, credentials: secure, state: state)
        await relaunchedModel.load()
        XCTAssertEqual(relaunchedModel.hintsShown, 2)
        XCTAssertEqual(relaunchedModel.game?.attempts.count, 1)
        XCTAssertEqual(relaunchedModel.nudgeReveals, expected)
    }

    @MainActor func testDailyThoughtRestoresForItsActivePuzzleAndClearsAfterReveal() async throws {
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
        let store = LocalStore(root: root)
        try store.saveDailyThought("Try reading the gaps", account: "member-a", puzzle: "puzzle-a")
        let model = makeNudgeTestModel(root: root, credentials: secure, state: NudgeRuntimeState())

        await model.load()

        XCTAssertEqual(model.dailyThought, "Try reading the gaps")
        XCTAssertTrue(model.canSaveDailyThought)
        await model.revealAnswer()
        XCTAssertTrue(model.game?.gameOver == true)
        XCTAssertEqual(model.dailyThought, "")
        XCTAssertEqual(store.dailyThought(account: "member-a", puzzle: "puzzle-a"), "")
    }

    @MainActor func testExpiredDailyThoughtIsClearedWhenSessionRestores() async throws {
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
        let store = LocalStore(root: root)
        try store.saveDailyThought("An old hunch", account: "member-a", puzzle: "puzzle-a")
        let model = makeNudgeTestModel(
            root: root,
            credentials: secure,
            state: NudgeRuntimeState(),
            nextPuzzleTime: "2000-01-02T00:00:00Z"
        )

        await model.load()

        XCTAssertEqual(model.dailyThought, "")
        XCTAssertEqual(store.dailyThought(account: "member-a", puzzle: "puzzle-a"), "")
        XCTAssertFalse(model.canSaveDailyThought)
    }

    @MainActor func testRelaunchAcrossPuzzleRolloverClearsThePreviousAccountThought() async throws {
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
        let store = LocalStore(root: root)
        try store.saveDailyThought("Previous puzzle hunch", account: "member-a", puzzle: "puzzle-a")
        try store.saveLastDailyPuzzle("puzzle-a", account: "member-a")
        let model = makeNudgeTestModel(
            root: root,
            credentials: secure,
            state: NudgeRuntimeState(puzzleID: "puzzle-b"),
            puzzleID: "puzzle-b"
        )

        await model.load()

        XCTAssertEqual(model.daily?.puzzle.id, "puzzle-b")
        XCTAssertTrue(model.canSaveDailyThought)
        XCTAssertEqual(model.dailyThought, "")
        XCTAssertEqual(store.dailyThought(account: "member-a", puzzle: "puzzle-a"), "")
        XCTAssertEqual(store.lastDailyPuzzle(account: "member-a"), "puzzle-b")
    }

    @MainActor func testFailedAccountSwitchCannotLetOldExpiryRemoveNewAccountThought() async throws {
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
        let store = LocalStore(root: root)
        try store.saveDailyThought("Member B’s saved thought", account: "member-b", puzzle: "puzzle-b")
        try store.saveLastDailyPuzzle("puzzle-b", account: "member-b")
        let expiry = ISO8601DateFormatter().string(from: Date().addingTimeInterval(5))
        let state = NudgeRuntimeState()
        let model = makeNudgeTestModel(
            root: root,
            credentials: secure,
            state: state,
            nextPuzzleTime: expiry
        )

        await model.load()
        XCTAssertEqual(model.player?.id, "member-a")
        model.saveDailyThought("Member A’s thought")

        let signedIn = await model.signIn(email: "member-b@example.com", password: "password")

        XCTAssertFalse(signedIn)
        XCTAssertEqual(model.player?.id, "member-b")
        XCTAssertEqual(model.daily?.puzzle.id, "puzzle-b")
        XCTAssertEqual(model.dailyThought, "")
        try await Task.sleep(for: .seconds(6))
        XCTAssertEqual(store.dailyThought(account: "member-b", puzzle: "puzzle-b"), "Member B’s saved thought")
    }

    @MainActor func testFailedRolloverCleanupRetriesBeforeAdvancingPuzzleMarker() async throws {
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
        let store = LocalStore(root: root)
        try store.saveDailyThought("Previous puzzle hunch", account: "member-a", puzzle: "puzzle-a")
        try store.saveLastDailyPuzzle("puzzle-a", account: "member-a")
        let accountDirectory = try XCTUnwrap(
            FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)
                .first(where: { $0.lastPathComponent.hasPrefix("account-") })
        )
        let model = makeNudgeTestModel(
            root: root,
            credentials: secure,
            state: NudgeRuntimeState(puzzleID: "puzzle-b"),
            puzzleID: "puzzle-b"
        )

        try FileManager.default.setAttributes([.posixPermissions: 0o500], ofItemAtPath: accountDirectory.path)
        await model.load()
        let retainedThought = store.dailyThought(account: "member-a", puzzle: "puzzle-a")
        let retainedMarker = store.lastDailyPuzzle(account: "member-a")
        let cleanupError = model.storageError

        try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: accountDirectory.path)
        await model.load()
        XCTAssertEqual(retainedThought, "Previous puzzle hunch")
        XCTAssertEqual(retainedMarker, "puzzle-a")
        XCTAssertEqual(cleanupError, "Your previous puzzle thought could not be cleared on this device.")
        XCTAssertEqual(store.dailyThought(account: "member-a", puzzle: "puzzle-a"), "")
        XCTAssertEqual(store.lastDailyPuzzle(account: "member-a"), "puzzle-b")
    }

    @MainActor func testLegacyHintCountRestoresAfterCurrentGuesses() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.save(1, key: "hints:member-a:puzzle-a")
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }

        let model = makeNudgeTestModel(
            root: root,
            credentials: secure,
            state: NudgeRuntimeState(acceptedGuess: true)
        )
        await model.load()

        XCTAssertEqual(model.hintsShown, 1)
        XCTAssertEqual(model.game?.attempts.count, 1)
        XCTAssertEqual(model.nudgeReveals, [DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 1)])
        XCTAssertEqual(
            try store.load([DailyNudgeReveal].self, key: "nudge-turns:member-a:puzzle-a"),
            [DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 1)]
        )
    }

    @MainActor func testRestoredHintCountIsClampedToAvailableAuthoredHints() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.save(99, key: "hints:member-a:puzzle-a")
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }

        let model = makeNudgeTestModel(root: root, credentials: secure, state: NudgeRuntimeState())
        await model.load()

        XCTAssertEqual(model.hintsShown, 3)
        XCTAssertEqual(model.nudgeReveals, [
            DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0),
            DailyNudgeReveal(hintIndex: 1, afterAttemptCount: 0),
            DailyNudgeReveal(hintIndex: 2, afterAttemptCount: 0),
        ])
    }

    @MainActor func testNudgeRestoreIgnoresOtherAccountsAndPuzzles() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = LocalStore(root: root)
        try store.save(2, key: "hints:member-b:puzzle-a")
        try store.save([DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0)], key: "nudge-turns:member-b:puzzle-a")
        try store.save(1, key: "hints:member-a:another-puzzle")
        try store.save([DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0)], key: "nudge-turns:member-a:another-puzzle")
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }

        let model = makeNudgeTestModel(root: root, credentials: secure, state: NudgeRuntimeState())
        await model.load()

        XCTAssertEqual(model.hintsShown, 0)
        XCTAssertTrue(model.nudgeReveals.isEmpty)
    }

    @MainActor func testNudgeRemainsAvailableInMemoryWhenPersistenceFails() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        try secure.write("member-token", key: "token")
        try secure.write("member", key: "identity-kind")
        defer {
            try? secure.write(nil, key: "token")
            try? secure.write(nil, key: "device")
            try? secure.write(nil, key: "identity-kind")
        }

        let model = makeNudgeTestModel(root: root, credentials: secure, state: NudgeRuntimeState())
        await model.load()
        try FileManager.default.removeItem(at: root)
        try Data("storage is unavailable".utf8).write(to: root)

        model.revealHint()

        XCTAssertEqual(model.hintsShown, 1)
        XCTAssertEqual(model.nudgeReveals, [DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0)])
        XCTAssertEqual(model.storageError, "Your hint progress could not be saved on this device.")
    }
}
