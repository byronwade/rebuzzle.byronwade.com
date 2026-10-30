import XCTest
import RebuzzleCore
@testable import Rebuzzle

@MainActor final class PracticeAPIClientTests: XCTestCase {
    private func makeClient() -> APIClient {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let client = APIClient(deviceID: "practice-test", session: URLSession(configuration: config))
        client.token = "member-token"
        client.plusTransactionJWSProvider = { "signed-plus-proof" }
        return client
    }

    func testDefaultAPIClientUsesConfiguredBundleHost() throws {
        let configuredHost = try XCTUnwrap(
            Bundle.main.object(forInfoDictionaryKey: "RebuzzleAPIBaseURL") as? String
        )
        let client = APIClient(deviceID: "configured-host-test")

        XCTAssertEqual(client.baseURL.absoluteString, configuredHost)
    }

    func testAPIClientPreservesExplicitBaseURLInjection() {
        let injectedURL = URL(string: "http://localhost:3000")!
        let client = APIClient(baseURL: injectedURL, deviceID: "injected-host-test")

        XCTAssertEqual(client.baseURL, injectedURL)
    }

    func testAPIClientResolutionDefaultsToProductionWhenUnset() {
        XCTAssertEqual(
            APIClient.resolvedBaseURL(from: [:]),
            URL(string: "https://rebuzzle.byronwade.com")
        )
    }

    func testAPIClientResolutionUsesHTTPSOrigin() {
        let betaURL = URL(string: "https://rebuzzle-beta.example")

        XCTAssertEqual(
            APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": "https://rebuzzle-beta.example"]),
            betaURL
        )

        XCTAssertEqual(
            APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": "https://rebuzzle-beta.example:8443"]),
            URL(string: "https://rebuzzle-beta.example:8443")
        )

        XCTAssertEqual(
            APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": "https://bücher.de"]),
            URL(string: "https://bücher.de")
        )

        XCTAssertEqual(
            APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": "https://[2001:db8::1]:8443"]),
            URL(string: "https://[2001:db8::1]:8443")
        )
    }

    func testAPIClientResolutionRejectsUnsafeOverrides() {
        let productionURL = URL(string: "https://rebuzzle.byronwade.com")
        let unsafeURLs = [
            "http://rebuzzle.example",
            "https://user:pass@rebuzzle.example",
            "https://rebuzzle.example/api",
            "https://rebuzzle.example?mode=test",
            "https://rebuzzle.example#fragment",
            "https://rebuzzle.example:99999",
            "https://rebuzzle.example:abc",
            "https://rebuzzle.example:9999999999999999999999999999",
            "https://%20",
            "https://[notipv6]",
            "https:///missing-host",
            "not a URL"
        ]

        for unsafeURL in unsafeURLs {
            XCTAssertEqual(
                APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": unsafeURL]),
                productionURL,
                "Unexpectedly accepted unsafe API origin: \(unsafeURL)"
            )
        }

        XCTAssertEqual(
            APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": 42]),
            productionURL
        )
    }

    func testFetchArchiveUsesCursorAndDecodesAnswerFreePuzzleMetadata() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"items":[{"id":"puzzle-7","puzzle":"☀️ + 🏠","puzzleType":"rebus","difficulty":6,"hints":["Read left to right."],"date":"2026-10-24"}],"nextCursor":"next"}"#)
        }

        let page = try await makeClient().fetchArchive(cursor: "2026-10-24:puzzle-7", limit: 12)

        XCTAssertEqual(page.items.map(\.id), ["puzzle-7"])
        XCTAssertEqual(page.items.first?.date, "2026-10-24")
        XCTAssertEqual(page.nextCursor, "next")
        let request = capture.snapshot()
        XCTAssertEqual(request.path, "/api/puzzles/archive")
        XCTAssertEqual(request.query["cursor"], "2026-10-24:puzzle-7")
        XCTAssertEqual(request.query["limit"], "12")
        XCTAssertEqual(request.authorization, "Bearer member-token")
        XCTAssertNil(request.dailyOnly)
        XCTAssertEqual(request.storeKitProof, "signed-plus-proof")
    }

    func testFetchArchiveSampleDecodesPublicPuzzleAndUsesAuthenticatedFreeRequest() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"id":"sample-1","puzzle":"MIND over MATTER","puzzleType":"wordplay","difficulty":7,"visual":{"mode":"composed","layout":"row","unicodeFallback":"MIND over MATTER","layers":[]},"hints":["Notice the placement."],"date":"2025-02-03"}"#)
        }

        let puzzle = try await makeClient().fetchArchiveSample()

        XCTAssertEqual(puzzle.id, "sample-1")
        XCTAssertEqual(puzzle.clue, "MIND over MATTER")
        XCTAssertEqual(puzzle.date, "2025-02-03")
        let request = capture.snapshot()
        XCTAssertEqual(request.path, "/api/puzzles/practice/sample")
        XCTAssertEqual(request.authorization, "Bearer member-token")
        XCTAssertNil(request.dailyOnly)
        XCTAssertNil(request.storeKitProof, "The free sample request should not send Plus purchase proof")
    }

    func testFetchJournalDecodesAccountEntryAndAttachesPlusProof() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"success":true,"entries":[{"puzzleId":"daily-7","puzzleDate":"2026-10-27","puzzleType":"rebus","clue":"☀️ + 🏠","answer":"sunshine","explanation":"Sun + shine.","won":true,"attempts":2,"hintsUsed":null,"visual":null,"hints":[],"note":"my thought","noteRevision":3}],"nextCursor":null,"historyStatus":"complete"}"#)
        }

        let result = try await makeClient().fetchJournal()

        XCTAssertEqual(result.entries.count, 1)
        XCTAssertEqual(result.entries[0].entry.puzzleID, "daily-7")
        XCTAssertEqual(result.entries[0].entry.answer, "sunshine")
        XCTAssertNil(result.entries[0].entry.hintsUsed)
        XCTAssertEqual(result.entries[0].entry.note, "my thought")
        XCTAssertEqual(result.entries[0].noteRevision, 3)
        XCTAssertEqual(result.historyStatus, "complete")
        XCTAssertEqual(capture.snapshot().path, "/api/user/journal")
        XCTAssertEqual(capture.snapshot().query["limit"], "100")
        XCTAssertEqual(capture.snapshot().storeKitProof, "signed-plus-proof")
    }

    func testFetchJournalFollowsEveryHistoryCursor() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            let isSecondPage = request.url?.query?.contains("before=2026-10-27") == true
            if !isSecondPage {
                return (200, #"{"success":true,"entries":[{"puzzleId":"daily-7","puzzleDate":"2026-10-27","puzzleType":"rebus","clue":"☀️ + 🏠","answer":"sunshine","explanation":"Sun + shine.","won":true,"attempts":2,"hintsUsed":null,"visual":null,"hints":[],"note":"first","noteRevision":1}],"nextCursor":"2026-10-27","historyStatus":"in_progress"}"#)
            }
            return (200, #"{"success":true,"entries":[{"puzzleId":"daily-6","puzzleDate":"2026-10-26","puzzleType":"rebus","clue":"🌧️ + 🐈","answer":"raining cats and dogs","explanation":"Rain + cats + dogs.","won":true,"attempts":3,"hintsUsed":1,"visual":null,"hints":[],"note":"second","noteRevision":2}],"nextCursor":null,"historyStatus":"complete"}"#)
        }

        let result = try await makeClient().fetchJournal()

        XCTAssertEqual(result.entries.map { $0.entry.puzzleID }, ["daily-7", "daily-6"])
        XCTAssertEqual(result.historyStatus, "complete")
        XCTAssertEqual(capture.snapshots().count, 2)
        XCTAssertEqual(capture.snapshots().last?.query["before"], "2026-10-27")
        XCTAssertTrue(capture.snapshots().allSatisfy { $0.storeKitProof == "signed-plus-proof" })
    }

    func testJournalNoteWriteUsesCompareAndSetAndAttachesPlusProof() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"success":true,"note":"kept","revision":4,"updatedAt":"2026-10-28T01:00:00.000Z"}"#)
        }

        let saved = try await makeClient().saveJournalNote(
            JournalSyncNoteWrite(puzzleID: "daily-7", note: "kept", expectedRevision: 3)
        )

        XCTAssertEqual(saved.note, "kept")
        XCTAssertEqual(saved.revision, 4)
        let request = capture.snapshot()
        XCTAssertEqual(request.path, "/api/user/journal/note")
        XCTAssertEqual(request.method, "PUT")
        XCTAssertEqual(request.storeKitProof, "signed-plus-proof")
        let body = try XCTUnwrap(request.jsonBody)
        XCTAssertEqual(body["puzzleId"] as? String, "daily-7")
        XCTAssertEqual(body["note"] as? String, "kept")
        XCTAssertEqual(body["expectedRevision"] as? Int, 3)
    }

    func testJournalConflictRetainsHTTPStatusForRefetch() async throws {
        defer { StubProtocol.responder = nil }
        StubProtocol.responder = { _ in (409, #"{"success":false,"error":"This note changed on another device."}"#) }

        do {
            _ = try await makeClient().saveJournalNote(
                JournalSyncNoteWrite(puzzleID: "daily-7", note: "local", expectedRevision: 2)
            )
            XCTFail("A stale note revision must be surfaced to the sync coordinator.")
        } catch let error as APIError {
            XCTAssertEqual(error.status, 409)
        }
    }

    func testPracticeGuessUsesUnscoredEndpointAndExplicitlyOptsOutOfDailyHeader() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"success":true,"correct":false,"similarity":0.4,"attemptNumber":2,"attemptsLeft":1,"maxAttempts":3,"gameOver":false,"roundToken":"next-round-token","reaction":{"tier":"warm","line":"A fresh angle might help."}}"#)
        }

        let result = try await makeClient().submitPracticeGuess(
            puzzleID: "puzzle-7", guess: "sunshine", attemptNumber: 2, roundToken: "previous-round-token"
        )

        XCTAssertFalse(result.correct)
        XCTAssertEqual(result.attemptNumber, 2)
        XCTAssertEqual(result.attemptsLeft, 1)
        XCTAssertEqual(result.roundToken, "next-round-token")
        XCTAssertNil(result.answer)
        let request = capture.snapshot()
        XCTAssertEqual(request.path, "/api/puzzles/practice/guess")
        XCTAssertEqual(request.method, "POST")
        XCTAssertEqual(request.dailyOnly, "false")
        XCTAssertEqual(request.storeKitProof, "signed-plus-proof")
        let payload = try XCTUnwrap(request.jsonBody)
        XCTAssertEqual(payload["puzzleId"] as? String, "puzzle-7")
        XCTAssertEqual(payload["guess"] as? String, "sunshine")
        XCTAssertEqual(payload["attemptNumber"] as? Int, 2)
        XCTAssertEqual(payload["roundToken"] as? String, "previous-round-token")
        XCTAssertNil(payload["hintsUsed"])
    }

    func testPracticeRevealUsesSeparateExplicitRevealEndpoint() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"success":true,"puzzleId":"puzzle-7","answer":"sunshine","explanation":"Sun + shine."}"#)
        }

        let result = try await makeClient().revealPracticeSolution(puzzleID: "puzzle-7", roundToken: "finished-round-token")

        XCTAssertEqual(result.answer, "sunshine")
        XCTAssertEqual(result.explanation, "Sun + shine.")
        let request = capture.snapshot()
        XCTAssertEqual(request.path, "/api/puzzles/practice/reveal")
        XCTAssertEqual(request.method, "POST")
        XCTAssertEqual(request.dailyOnly, "false")
        XCTAssertEqual(request.storeKitProof, "signed-plus-proof")
        let payload = try XCTUnwrap(request.jsonBody)
        XCTAssertEqual(payload["puzzleId"] as? String, "puzzle-7")
        XCTAssertEqual(payload["roundToken"] as? String, "finished-round-token", "A solution reveal uses the server-signed completed round")
        XCTAssertEqual(payload.count, 2, "A solution should only be requested after the explicit post-round reveal action")
    }

    func testPracticeEveQuipCarriesTheStoreKitProof() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, "Eve has a thought.")
        }
        let guess = try JSONDecoder().decode(Guess.self, from: Data(#"{"guess":"sunshine","correct":false,"attemptNumber":1,"reaction":{"tier":"warm","line":"A fresh angle might help."}}"#.utf8))

        try await makeClient().streamQuip(puzzleID: "puzzle-7", guess: guess, scope: .practice) { _ in }

        XCTAssertEqual(capture.snapshot().path, "/api/puzzles/quip")
        XCTAssertEqual(capture.snapshot().storeKitProof, "signed-plus-proof")
    }

    func testDailyGuessStillGetsDailyOnlyHeaderByDefault() async throws {
        defer { StubProtocol.responder = nil }
        let capture = RequestCapture()
        StubProtocol.responder = { request in
            capture.record(request)
            return (200, #"{"success":true,"correct":false,"attemptsLeft":2,"maxAttempts":3,"gameOver":false,"attemptNumber":1}"#)
        }

        let _: GuessResponse = try await makeClient().request("/api/puzzles/guess", method: "POST", body: ["puzzleId": "today", "guess": "wrong"])
        XCTAssertEqual(capture.snapshot().path, "/api/puzzles/guess")
        XCTAssertEqual(capture.snapshot().dailyOnly, "true")
    }
}

private struct RequestSnapshot {
    let path: String?
    let method: String?
    let query: [String: String]
    let authorization: String?
    let dailyOnly: String?
    let storeKitProof: String?
    let jsonBody: [String: Any]?
}

private final class RequestCapture: @unchecked Sendable {
    private let lock = NSLock()
    private var saved: [RequestSnapshot] = []

    func record(_ request: URLRequest) {
        let query = URLComponents(url: request.url ?? URL(fileURLWithPath: "/"), resolvingAgainstBaseURL: false)?.queryItems ?? []
        let body: Data?
        if let httpBody = request.httpBody {
            body = httpBody
        } else if let stream = request.httpBodyStream {
            stream.open()
            defer { stream.close() }
            var bytes = [UInt8](repeating: 0, count: 1024)
            var data = Data()
            while stream.hasBytesAvailable {
                let count = stream.read(&bytes, maxLength: bytes.count)
                guard count > 0 else { break }
                data.append(bytes, count: count)
            }
            body = data
        } else {
            body = nil
        }
        let json = body.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
        let next = RequestSnapshot(
            path: request.url?.path,
            method: request.httpMethod,
            query: Dictionary(query.map { ($0.name, $0.value ?? "") }, uniquingKeysWith: { _, last in last }),
            authorization: request.value(forHTTPHeaderField: "Authorization"),
            dailyOnly: request.value(forHTTPHeaderField: "X-Rebuzzle-Daily-Only"),
            storeKitProof: request.value(forHTTPHeaderField: "X-Rebuzzle-StoreKit-Transaction"),
            jsonBody: json
        )
        lock.lock()
        saved.append(next)
        lock.unlock()
    }

    func snapshot() -> RequestSnapshot {
        lock.lock()
        defer { lock.unlock() }
        return saved.last ?? RequestSnapshot(path: nil, method: nil, query: [:], authorization: nil, dailyOnly: nil, storeKitProof: nil, jsonBody: nil)
    }

    func snapshots() -> [RequestSnapshot] {
        lock.lock()
        defer { lock.unlock() }
        return saved
    }
}
