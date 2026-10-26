import Foundation

@MainActor enum AppModelFactory {
    static func make() -> AppModel {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-fixture") || ProcessInfo.processInfo.arguments.contains("--preview") {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.protocolClasses = [FixtureURLProtocol.self]
            let run = UUID().uuidString
            let api = APIClient(baseURL: URL(string: "https://fixture.invalid")!, deviceID: "ui-fixture", session: URLSession(configuration: configuration))
            return AppModel(api: api, storage: LocalStore(root: FileManager.default.temporaryDirectory.appendingPathComponent("rebuzzle-ui-\(run)")), credentials: CredentialStore(service: "com.byronwade.rebuzzle.ui-fixture.\(run)"))
        }
        #endif
        return AppModel()
    }
}

#if DEBUG
import RebuzzleCore

/// Intercepts every request in the injected session, including unexpected paths.
/// Nothing in fixture mode can fall through to production gameplay networking.
private final class FixtureURLProtocol: URLProtocol, @unchecked Sendable {
    private static let state = FixtureServer()
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.state.respond(to: request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}

private final class FixtureServer: @unchecked Sendable {
    private let lock = NSLock()
    private let nextPuzzleTime = ISO8601DateFormatter().string(from: Date().addingTimeInterval(86_400))
    private var game = GameSession(puzzleId: "fixture-lighthouse", puzzleDate: "2026-10-25")
    private let user: [String: Any] = ["id": "fixture-guest", "username": "Curious guest", "isGuest": true]

    func respond(to request: URLRequest) throws -> (Int, Data) {
        lock.lock(); defer { lock.unlock() }
        var status = 200
        let payload: [String: Any]
        switch request.url?.path {
        case "/api/puzzle/today":
            payload = ["success": true, "puzzle": ["id": game.puzzleId, "puzzle": "💡 + 🏠", "puzzleType": "rebus", "difficulty": 5, "hints": ["Read each clue from left to right.", "Name each picture plainly.", "Join the parts into one familiar word."], "date": game.puzzleDate], "puzzleDate": game.puzzleDate, "nextPuzzleTime": nextPuzzleTime]
        case "/api/auth/guest/lazy", "/api/auth/session":
            payload = ["success": true, "authenticated": true, "user": user, "token": "fixture-token"]
        case "/api/puzzle/session":
            return (200, try JSONEncoder().encode(game))
        case "/api/user/stats":
            payload = ["success": true, "stats": ["totalGames": game.gameOver ? 1 : 0, "wins": game.wasSuccessful == true ? 1 : 0, "streak": game.wasSuccessful == true ? 1 : 0]]
        case "/api/puzzles/guess":
            if game.gameOver {
                status = 409; payload = ["error": "This puzzle is already complete."]
            } else {
                let body = try JSONSerialization.jsonObject(with: bodyData(request)) as? [String: Any]
                let guess = body?["guess"] as? String ?? ""
                let correct = guess.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "lighthouse"
                let count = game.attempts.count + 1
                let finished = correct || count == 3
                var result: [String: Any] = ["success": true, "correct": correct, "attemptsLeft": 3 - count, "maxAttempts": 3, "gameOver": finished, "attemptNumber": count]
                if finished {
                    result["answer"] = "lighthouse"
                    result["explanation"] = "Light + house makes lighthouse: a beacon that helps ships find their way."
                }
                let response = try JSONDecoder().decode(GuessResponse.self, from: JSONSerialization.data(withJSONObject: result))
                game.apply(response, guess: guess)
                game.hintsUsed = body?["hintsUsed"] as? Int ?? 0
                payload = result
            }
        case "/api/auth/logout": payload = ["success": true]
        default: status = 404; payload = ["error": "This route is not available in the UI fixture."]
        }
        return (status, try JSONSerialization.data(withJSONObject: payload))
    }

    private func bodyData(_ request: URLRequest) -> Data {
        if let body = request.httpBody { return body }
        guard let stream = request.httpBodyStream else { return Data("{}".utf8) }
        stream.open(); defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 1024)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            guard count > 0 else { break }
            data.append(buffer, count: count)
        }
        return data
    }
}
#endif
