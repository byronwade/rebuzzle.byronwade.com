import XCTest
import RebuzzleCore
@testable import Rebuzzle

final class SubmissionTests: XCTestCase {
    @MainActor func testLostResponseMustRestoreBeforeAnotherSubmission() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let secure = CredentialStore(service: "test." + UUID().uuidString)
        defer {
            try? FileManager.default.removeItem(at: root)
            for key in ["token", "device", "identity-kind"] { try? secure.write(nil, key: key) }
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var submissions = 0
        StubProtocol.responder = { request in
            switch request.url!.path {
            case "/api/puzzle/today": return (200, #"{"success":true,"puzzle":{"id":"a","puzzle":"x","puzzleType":"rebus","difficulty":5,"hints":[]},"puzzleDate":"2099-01-01","nextPuzzleTime":"2099-01-02T00:00:00Z"}"#)
            case "/api/auth/guest/lazy": return (200, #"{"success":true,"token":"fresh","user":{"id":"guest-a","username":"Guest","isGuest":true}}"#)
            case "/api/puzzle/session":
                if submissions == 0 { return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2099-01-01","attempts":[],"hintsUsed":0,"attemptsLeft":3,"maxAttempts":3,"gameOver":false}"#) }
                return (200, #"{"success":true,"puzzleId":"a","puzzleDate":"2099-01-01","attempts":[{"guess":"wrong","correct":false,"attemptNumber":1}],"hintsUsed":0,"attemptsLeft":2,"maxAttempts":3,"gameOver":false}"#)
            case "/api/puzzles/guess":
                XCTAssertEqual(request.value(forHTTPHeaderField: "X-Rebuzzle-Daily-Only"), "true")
                submissions += 1
                throw URLError(.timedOut)
            default: return (200, #"{"success":true,"stats":{}}"#)
            }
        }
        let model = AppModel(api: APIClient(deviceID: "test", session: URLSession(configuration: config)), storage: LocalStore(root: root), credentials: secure)
        await model.load()
        model.draft = "wrong"
        await model.submit()
        XCTAssertTrue(model.needsReconciliation)
        await model.submit()
        XCTAssertEqual(submissions, 1, "An ambiguous POST must not be replayed")
        XCTAssertFalse(model.needsReconciliation)
        XCTAssertEqual(model.game?.attemptsLeft, 2)
        XCTAssertEqual(model.game?.attempts.first?.guess, "wrong")
    }
}
