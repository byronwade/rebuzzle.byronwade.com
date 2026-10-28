import XCTest
import RebuzzleCore
@testable import Rebuzzle

@MainActor final class DailySolveDistributionAPITests: XCTestCase {
    private func makeClient() -> APIClient {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        return APIClient(baseURL: URL(string: "https://api.rebuzzle.test")!, deviceID: "solve-mix-test", session: URLSession(configuration: config))
    }

    func testFetchEncodesPuzzleIDAndDecodesDistribution() async throws {
        defer { StubProtocol.responder = nil }
        var capturedURL: URL?
        StubProtocol.responder = { request in
            capturedURL = request.url
            return (200, #"{"available":true,"minimumSolves":20,"oneGuessPercent":30,"twoGuessesPercent":30,"threeGuessesPercent":20,"fourPlusPercent":20}"#)
        }

        let distribution = try await makeClient().fetchDailySolveDistribution(puzzleID: "daily & #")

        XCTAssertEqual(distribution.available, true)
        XCTAssertEqual(distribution.percentage(for: .fourPlus), 20)
        let components = try XCTUnwrap(capturedURL.flatMap { URLComponents(url: $0, resolvingAgainstBaseURL: false) })
        XCTAssertEqual(components.path, "/api/puzzles/solve-distribution")
        XCTAssertEqual(components.queryItems, [URLQueryItem(name: "puzzleId", value: "daily & #")])
        XCTAssertEqual(components.percentEncodedQuery, "puzzleId=daily%20%26%20%23")
    }

    func testFetchSurfacesServerErrors() async throws {
        defer { StubProtocol.responder = nil }
        StubProtocol.responder = { _ in (503, #"{"error":"Please retry shortly."}"#) }

        do {
            _ = try await makeClient().fetchDailySolveDistribution(puzzleID: "daily-7")
            XCTFail("A server error should fail the distribution request.")
        } catch let error as APIError {
            XCTAssertEqual(error.status, 503)
            XCTAssertEqual(error.message, "Please retry shortly.")
        }
    }
}
