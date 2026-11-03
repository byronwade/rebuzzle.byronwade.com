import XCTest
import RebuzzleCore
@testable import Rebuzzle

final class EveReplyTests: XCTestCase {
    @MainActor func testDailyNudgeFollowUpRequestUsesAuthenticatedJSONEndpoint() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            XCTAssertEqual(request.url?.path, "/api/puzzles/nudge-reply")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
            XCTAssertEqual(request.value(forHTTPHeaderField: "X-Device-Id"), "test-device")
            let body: Data
            if let httpBody = request.httpBody {
                body = httpBody
            } else {
                let stream = try XCTUnwrap(request.httpBodyStream)
                stream.open()
                defer { stream.close() }
                var data = Data()
                var buffer = [UInt8](repeating: 0, count: 256)
                while stream.hasBytesAvailable {
                    let count = stream.read(&buffer, maxLength: buffer.count)
                    if count <= 0 { break }
                    data.append(buffer, count: count)
                }
                body = data
            }
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: Any])
            XCTAssertEqual(json["puzzleId"] as? String, "today")
            XCTAssertEqual(json["hintIndex"] as? Int, 1)
            XCTAssertEqual(Set(json.keys), Set(["puzzleId", "hintIndex"]))
            return (200, #"{"success":true,"reply":"Notice the spacing."}"#)
        }
        let api = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        api.token = "test-token"

        let reply = try await api.fetchEveNudgeReply(puzzleID: "today", hintIndex: 1)

        XCTAssertEqual(reply, "Notice the spacing.")
    }

    @MainActor func testNudgeFollowUpIsSavedAndRestoredForTheSameAccountAndPuzzle() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var requests = 0
        let storage = LocalStore(root: root)
        let store = EveReplyStore(
            storage: storage,
            transport: { _, _, _, _ in },
            nudgeFollowUpTransport: { puzzleID, hintIndex in
                requests += 1
                return "Look closely at the spacing."
            }
        )
        store.activate(accountID: "a", puzzleID: "today")

        await store.requestNudgeFollowUp(hintIndex: 1)?.value

        XCTAssertEqual(requests, 1)
        XCTAssertEqual(store.nudgeFollowUpReplies[1], "Look closely at the spacing.")
        XCTAssertTrue(store.requestedNudgeFollowUpHintIndexes.contains(1))
        XCTAssertNil(store.requestNudgeFollowUp(hintIndex: 1))

        let restored = EveReplyStore(
            storage: storage,
            transport: { _, _, _, _ in },
            nudgeFollowUpTransport: { _, _ in XCTFail("A restored reply should not be requested again"); return "" }
        )
        restored.activate(accountID: "a", puzzleID: "today")

        XCTAssertEqual(restored.nudgeFollowUpReplies[1], "Look closely at the spacing.")
        XCTAssertTrue(restored.requestedNudgeFollowUpHintIndexes.contains(1))
        XCTAssertNil(restored.requestNudgeFollowUp(hintIndex: 1))
    }

    @MainActor func testNudgeFollowUpCanRetryOnceAfterFailure() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var requests = 0
        let store = EveReplyStore(
            storage: LocalStore(root: root),
            transport: { _, _, _, _ in },
            nudgeFollowUpTransport: { _, _ in
                requests += 1
                throw URLError(.notConnectedToInternet)
            }
        )
        store.activate(accountID: "a", puzzleID: "today")

        await store.requestNudgeFollowUp(hintIndex: 0)?.value
        XCTAssertTrue(store.failedNudgeFollowUpHintIndexes.contains(0))
        let retry = store.retryNudgeFollowUp(hintIndex: 0)
        XCTAssertNotNil(retry)
        await retry?.value

        XCTAssertEqual(requests, 2)
        XCTAssertTrue(store.failedNudgeFollowUpHintIndexes.contains(0))
        XCTAssertNil(store.retryNudgeFollowUp(hintIndex: 0))
        XCTAssertNil(store.requestNudgeFollowUp(hintIndex: 0))
    }

    @MainActor func testNudgeFollowUpStateDoesNotCrossAccounts() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = EveReplyStore(
            storage: LocalStore(root: root),
            transport: { _, _, _, _ in },
            nudgeFollowUpTransport: { puzzleID, _ in "Reply for \(puzzleID)." }
        )
        store.activate(accountID: "a", puzzleID: "today")
        await store.requestNudgeFollowUp(hintIndex: 0)?.value

        store.activate(accountID: "b", puzzleID: "today")
        XCTAssertTrue(store.nudgeFollowUpReplies.isEmpty)
        XCTAssertTrue(store.requestedNudgeFollowUpHintIndexes.isEmpty)

        store.activate(accountID: "a", puzzleID: "today")
        XCTAssertEqual(store.nudgeFollowUpReplies[0], "Reply for today.")
    }

    @MainActor func testLateNudgeFollowUpCannotCrossPuzzleChange() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var started = false
        var release: CheckedContinuation<String, Never>?
        let store = EveReplyStore(
            storage: LocalStore(root: root),
            transport: { _, _, _, _ in },
            nudgeFollowUpTransport: { _, _ in
                started = true
                return await withCheckedContinuation { continuation in release = continuation }
            }
        )
        store.activate(accountID: "a", puzzleID: "today")

        let work = store.requestNudgeFollowUp(hintIndex: 0)
        while !started { await Task.yield() }
        store.activate(accountID: "a", puzzleID: "tomorrow")
        let resume = release
        release = nil
        resume?.resume(returning: "A stale reply.")
        await work?.value

        XCTAssertTrue(store.nudgeFollowUpReplies.isEmpty)
        XCTAssertTrue(store.pendingNudgeFollowUpHintIndexes.isEmpty)
    }

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
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, _, _, _ in throw URLError(.notConnectedToInternet) }
        store.activate(accountID: "a", puzzleID: "p")
        await store.request(guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()))?.value
        XCTAssertTrue(store.pendingAttempts.isEmpty)
        XCTAssertTrue(store.replies.isEmpty)
        XCTAssertEqual(store.failedAttempts, Set([1]))
    }

    @MainActor func testFailedReplyCanRetryTheSameConfirmedGuess() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var requests: [(String, Int)] = []
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, guess, _, update in
            requests.append((guess.guess, guess.attemptNumber))
            if requests.count == 1 { throw URLError(.notConnectedToInternet) }
            update("Look at the relationship between the clues.")
        }
        store.activate(accountID: "a", puzzleID: "p")
        let guess = Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction())

        XCTAssertNil(store.retry(guess: guess))
        await store.request(guess: guess)?.value
        XCTAssertEqual(store.failedAttempts, Set([1]))

        let retry = store.retry(guess: guess)
        XCTAssertNotNil(retry)
        await retry?.value

        XCTAssertEqual(requests.map(\.0), ["sun", "sun"])
        XCTAssertEqual(requests.map(\.1), [1, 1])
        XCTAssertTrue(store.failedAttempts.isEmpty)
        XCTAssertTrue(store.pendingAttempts.isEmpty)
        XCTAssertEqual(store.replies[1], "Look at the relationship between the clues.")
    }

    @MainActor func testBlankReplyIsRetryable() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, _, _, update in update(" \n\t") }
        store.activate(accountID: "a", puzzleID: "p")

        await store.request(guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()))?.value

        XCTAssertNil(store.replies[1])
        XCTAssertEqual(store.failedAttempts, Set([1]))
    }

    @MainActor func testTimedOutReplyCanBeRetried() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, _, _, _ in
            try await Task.sleep(for: .seconds(30))
        }
        store.activate(accountID: "a", puzzleID: "p")

        await store.request(guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()))?.value

        XCTAssertTrue(store.pendingAttempts.isEmpty)
        XCTAssertEqual(store.failedAttempts, Set([1]))
    }

    @MainActor func testFailureStateDoesNotCrossAccounts() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, _, _, _ in throw URLError(.notConnectedToInternet) }
        store.activate(accountID: "a", puzzleID: "p")
        await store.request(guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()))?.value
        XCTAssertEqual(store.failedAttempts, Set([1]))

        store.activate(accountID: "b", puzzleID: "p")

        XCTAssertTrue(store.failedAttempts.isEmpty)
    }

    @MainActor func testRetryDoesNotCancelAnotherEveReplyInProgress() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var attemptOneRequests = 0
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, guess, _, update in
            if guess.attemptNumber == 1 {
                attemptOneRequests += 1
                if attemptOneRequests == 1 { throw URLError(.notConnectedToInternet) }
            }
            try await Task.sleep(for: .milliseconds(40))
            update("Reply for guess \(guess.attemptNumber).")
        }
        store.activate(accountID: "a", puzzleID: "p")
        let failedGuess = Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction())
        let currentGuess = Guess(guess: "flower", correct: false, attemptNumber: 2, reaction: try reaction())
        await store.request(guess: failedGuess)?.value

        let currentReply = store.request(guess: currentGuess)
        let retry = store.retry(guess: failedGuess)
        defer { retry?.cancel() }

        XCTAssertNotNil(retry)
        XCTAssertEqual(store.pendingAttempts, Set([1, 2]))
        await currentReply?.value
        await retry?.value
        XCTAssertEqual(store.pendingAttempts, [])
        XCTAssertEqual(store.replies[1], "Reply for guess 1.")
        XCTAssertEqual(store.replies[2], "Reply for guess 2.")
    }

    @MainActor func testNewGuessDoesNotCancelEarlierEveReply() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var firstRequestStarted = false
        var releaseFirstRequest: CheckedContinuation<Void, Never>?
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, guess, _, update in
            if guess.attemptNumber == 1 {
                firstRequestStarted = true
                await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                    releaseFirstRequest = continuation
                }
                update("The first guess has a connection worth following.")
            } else {
                update("The second guess shifts the picture.")
            }
        }
        store.activate(accountID: "a", puzzleID: "p")
        let firstGuess = Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction())
        let secondGuess = Guess(guess: "moon", correct: false, attemptNumber: 2, reaction: try reaction())

        let firstReply = store.request(guess: firstGuess)
        while !firstRequestStarted { await Task.yield() }
        XCTAssertEqual(store.pendingAttempts, Set([1]))

        let secondReply = store.request(guess: secondGuess)
        XCTAssertEqual(store.pendingAttempts, Set([1, 2]))
        await secondReply?.value
        XCTAssertEqual(store.pendingAttempts, Set([1]))
        let resumeFirst = releaseFirstRequest
        releaseFirstRequest = nil
        resumeFirst?.resume()
        await firstReply?.value

        XCTAssertEqual(store.replies[1], "The first guess has a connection worth following.")
        XCTAssertEqual(store.replies[2], "The second guess shifts the picture.")
        XCTAssertTrue(store.failedAttempts.isEmpty)
    }

    @MainActor func testLateResponseCannotCrossAccountAndCachedReplyRestores() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = LocalStore(root: root)
        let saved = EveReplyStore(storage: storage) { _, _, _, update in update("An unexpected detour.") }
        saved.activate(accountID: "a", puzzleID: "p")
        let guess = Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction())
        await saved.request(guess: guess)?.value
        saved.activate(accountID: "b", puzzleID: "p")
        XCTAssertTrue(saved.replies.isEmpty)
        saved.activate(accountID: "a", puzzleID: "p")
        XCTAssertEqual(saved.replies[1], "An unexpected detour.")
        var started = false
        let late = EveReplyStore(storage: storage) { _, _, _, update in
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
        XCTAssertTrue(late.pendingAttempts.isEmpty)
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

    @MainActor func testPracticeAndDailyRepliesUseSeparateScopes() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var requestedScopes: [EveReplyScope] = []
        let store = EveReplyStore(storage: LocalStore(root: root)) { _, _, scope, update in
            requestedScopes.append(scope)
            update(scope == .practice ? "Practice Eve." : "Daily Eve.")
        }
        let guess = Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction())

        store.activate(accountID: "a", puzzleID: "p")
        await store.request(guess: guess)?.value
        XCTAssertEqual(store.replies[1], "Daily Eve.")

        store.activate(accountID: "a", puzzleID: "p", scope: .practice)
        XCTAssertTrue(store.replies.isEmpty)
        await store.request(guess: guess)?.value
        XCTAssertEqual(store.replies[1], "Practice Eve.")

        store.activate(accountID: "a", puzzleID: "p")
        XCTAssertEqual(store.replies[1], "Daily Eve.")
        XCTAssertEqual(requestedScopes, [.daily, .practice])
    }

    @MainActor func testPracticeQuipSendsPracticeMode() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        StubProtocol.responder = { request in
            let body: Data
            if let httpBody = request.httpBody {
                body = httpBody
            } else {
                let stream = try XCTUnwrap(request.httpBodyStream)
                stream.open()
                defer { stream.close() }
                var data = Data()
                var buffer = [UInt8](repeating: 0, count: 1024)
                while stream.hasBytesAvailable {
                    let count = stream.read(&buffer, maxLength: buffer.count)
                    if count <= 0 { break }
                    data.append(buffer, count: count)
                }
                body = data
            }
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: String])
            XCTAssertEqual(json["mode"], "practice")
            return (200, "Practice only.")
        }
        let api = APIClient(deviceID: "test-device", session: URLSession(configuration: config))
        var value = ""
        try await api.streamQuip(
            puzzleID: "p",
            guess: Guess(guess: "sun", correct: false, attemptNumber: 1, reaction: try reaction()),
            scope: .practice,
            onUpdate: { value = $0 }
        )
        XCTAssertEqual(value, "Practice only.")
    }

    private func reaction() throws -> GuessReaction {
        try JSONDecoder().decode(GuessReaction.self, from: Data(#"{"tier":"cold","line":"Try another angle."}"#.utf8))
    }
}
