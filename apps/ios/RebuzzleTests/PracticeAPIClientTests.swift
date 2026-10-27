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
            "not a URL"
        ]

        for unsafeURL in unsafeURLs {
            XCTAssertEqual(
                APIClient.resolvedBaseURL(from: ["RebuzzleAPIBaseURL": unsafeURL]),
                productionURL,
                "Unexpectedly accepted unsafe API origin: \(unsafeURL)"
            )
        }
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
    private var saved: RequestSnapshot?

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
        saved = next
        lock.unlock()
    }

    func snapshot() -> RequestSnapshot {
        lock.lock()
        defer { lock.unlock() }
        return saved ?? RequestSnapshot(path: nil, method: nil, query: [:], authorization: nil, dailyOnly: nil, storeKitProof: nil, jsonBody: nil)
    }
}
