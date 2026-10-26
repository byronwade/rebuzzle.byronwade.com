import XCTest
import RebuzzleCore
@testable import Rebuzzle

final class EveReplyTests: XCTestCase {
    @MainActor func testStreamUsesBearerAndPreservesUnicode() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            XCTAssertEqual(request.url?.path, "/api/puzzles/quip")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
            XCTAssertEqual(request.value(forHTTPHeaderField: "X-Device-Id"), "test-device")
            return (200, "That’s a curious turn — café.")
        }
        let api = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        api.token = "test-token"
        var value = ""
        try await api.streamQuip(puzzleID: "p", guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()), onUpdate: { value = $0 })
        XCTAssertEqual(value, "That’s a curious turn — café.")
    }

    @MainActor func testOptionalFailureClearsPendingWithoutCreatingReply() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, _, _ in throw URLError(.notConnectedToInternet) }
        store.activate(accountID: "a", puzzleID: "p")
        await store.request(guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()))?.value
        XCTAssertNil(store.pendingAttempt)
        XCTAssertTrue(store.replies.isEmpty)
    }

    @MainActor func testLateResponseCannotCrossAccountAndCachedReplyRestores() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)
        let saved = EveReplyStore(storage: storage) { _, _, update in update("An unexpected detour.") }
        saved.activate(accountID: "a", puzzleID: "p")
        let guess = Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction())
        await saved.request(guess: guess)?.value
        saved.activate(accountID: "b", puzzleID: "p")
        XCTAssertTrue(saved.replies.isEmpty)
        saved.activate(accountID: "a", puzzleID: "p")
        XCTAssertEqual(saved.replies[1], "An unexpected detour.")
        var started = false
        let late = EveReplyStore(storage: storage) { _, _, update in
            started = true
            try? await Task.sleep(for: .milliseconds(40))
            update("Stale private reply")
        }
        late.activate(accountID: "a", puzzleID: "p")
        let work = late.request(guess: Guess(guess: "moon", correct: false, attemptNumber: 2, reaction: try reaction()))
        while !started { await Task.yield() }
        late.activate(accountID: "b", puzzleID: "p")
        await work?.value
        XCTAssertTrue(late.replies.isEmpty)
        XCTAssertNil(late.pendingAttempt)
    }

    @MainActor func testHTTPFailureNeverAppearsAsAnEveReply() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { _ in (429, #"{"error":"Rate limited"}"#) }
        let api = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        var value = ""
        do {
            try await api.streamQuip(puzzleID: "p", guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()), onUpdate: { value = $0 })
            XCTFail("An unsuccessful HTTP response must be rejected")
        } catch { XCTAssertTrue(value.isEmpty) }
    }

    private func reaction() throws -> GuessReaction {
        try JSONDecoder().decode(GuessReaction.self, from: Data(#"{"tier":"cold","line":"Try another angle."}"#.utf8))
    }
}
