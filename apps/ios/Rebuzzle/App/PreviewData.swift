import Foundation

@MainActor enum AppModelFactory {
    static func make() -> AppModel {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-fixture") || ProcessInfo.processInfo.arguments.contains("--preview") {
            let arguments = ProcessInfo.processInfo.arguments
            if arguments.contains("--ui-fresh-install") {
                UserDefaults.standard.removeObject(forKey: "hasSeenFirstSessionQuickStart")
            } else if arguments.contains("--ui-returning-player") {
                UserDefaults.standard.set(true, forKey: "hasSeenFirstSessionQuickStart")
            }
            let credentials = CredentialStore(service: "com.byronwade.rebuzzle.ui-fixture", inMemory: true)
            if arguments.contains("--ui-existing-install") {
                try? credentials.write("fixture-existing-device", key: "device")
            }
            markQuickStartSeenForExistingInstall(credentials)
            let configuration = URLSessionConfiguration.ephemeral
            configuration.protocolClasses = [FixtureURLProtocol.self]
            let run = UUID().uuidString
            let api = APIClient(baseURL: URL(string: "https://fixture.invalid")!, deviceID: "ui-fixture", session: URLSession(configuration: configuration))
            return AppModel(api: api, storage: LocalStore(root: FileManager.default.temporaryDirectory.appendingPathComponent("rebuzzle-ui-\(run)")), credentials: credentials)
        }
        #endif
        let credentials = CredentialStore()
        markQuickStartSeenForExistingInstall(credentials)
        return AppModel(credentials: credentials)
    }

    private static func markQuickStartSeenForExistingInstall(_ credentials: CredentialStore) {
        let key = "hasSeenFirstSessionQuickStart"
        guard UserDefaults.standard.object(forKey: key) == nil,
              (try? credentials.read("device")) != nil else { return }
        UserDefaults.standard.set(true, forKey: key)
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
    private let nextPuzzleTime = ISO8601DateFormatter().string(from: Date().addingTimeInterval(
        ProcessInfo.processInfo.arguments.contains("--ui-daily-thought-expiry") ? 12 : 86_400
    ))
    private let expiredNextPuzzleTime = ISO8601DateFormatter().string(from: Date().addingTimeInterval(-1))
    private let expiredResetFixture = ProcessInfo.processInfo.arguments.contains("--ui-expired-reset-manual")
    private let scoreLockedFixture = ProcessInfo.processInfo.arguments.contains("--ui-score-locked")
    private let lateSolveFixture = ProcessInfo.processInfo.arguments.contains("--ui-late-solve")
    private let expiredReviewFixture = ProcessInfo.processInfo.arguments.contains("--ui-expired-review")
    private let existingInstallFixture = ProcessInfo.processInfo.arguments.contains("--ui-existing-install")
    private var dailyRequestCount = 0
    private var quipRequestCount = 0
    private var solveDistributionRequestCount = 0
    private var game = GameSession(puzzleId: "fixture-lighthouse", puzzleDate: FixtureServer.todayKey)
    private static var todayKey: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
    private static var nextDayKey: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date())
    }

    init() {
        UserDefaults.standard.set(0, forKey: "uiFixtureDailySolvePulseRequestCount")
        if existingInstallFixture {
            game.attempts = [Guess(guess: "sunrise", correct: false, attemptNumber: 1)]
            game.attemptsLeft = 2
        }
        if scoreLockedFixture {
            game.attempts = [
                Guess(guess: "beacon home", correct: false, attemptNumber: 1),
                Guess(guess: "ship light", correct: false, attemptNumber: 2),
                Guess(guess: "harbor", correct: false, attemptNumber: 3)
            ]
            game.attemptsLeft = 0
            game.phase = "score_locked"
            game.scoreLocked = true
            game.playMode = "extended"
        }
        if lateSolveFixture {
            game.attempts = [
                Guess(guess: "beacon home", correct: false, attemptNumber: 1),
                Guess(guess: "ship light", correct: false, attemptNumber: 2),
                Guess(guess: "harbor", correct: false, attemptNumber: 3),
                Guess(guess: "lighthouse", correct: true, attemptNumber: 4)
            ]
            game.attemptsLeft = 0
            game.gameOver = true
            game.wasSuccessful = true
            game.answer = "lighthouse"
            game.explanation = "Light + house makes lighthouse: a beacon that helps ships find their way."
            game.phase = "solved"
            game.scoreLocked = true
            game.playMode = "extended"
        }
        if expiredReviewFixture {
            game.expiredReview = ExpiredDailyReview(
                puzzleId: "fixture-yesterday",
                puzzleDate: "2026-10-26",
                answer: "yesterday’s answer",
                explanation: "A reviewed explanation from yesterday’s puzzle."
            )
        }
        if expiredResetFixture {
            let terminalGuess = Data(#"{"success":true,"correct":true,"attemptsLeft":2,"maxAttempts":3,"gameOver":true,"attemptNumber":1,"answer":"lighthouse","explanation":"Light + house makes lighthouse.","reaction":{"tier":"correct","line":"You made the connection."}}"#.utf8)
            if let response = try? JSONDecoder().decode(GuessResponse.self, from: terminalGuess) {
                game.apply(response, guess: "lighthouse")
            }
        }
    }

    private static var visual: [String: Any] {
        if ProcessInfo.processInfo.arguments.contains("--ui-canonical-invalid") {
            return ["mode": "unicode", "unicodeFallback": "Do not display this legacy clue", "layers": [], "canonicalBoard": NSNull()]
        }
        if ProcessInfo.processInfo.arguments.contains("--ui-canonical-board"),
           let url = Bundle.main.url(forResource: "CanonicalBoardFixture", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let artifact = try? JSONSerialization.jsonObject(with: data) {
            // Unicode mode intentionally checks canonical-first routing.
            return ["mode": "unicode", "layout": "stack", "unicodeFallback": "HEAD over HEELS", "layers": [], "canonicalBoard": artifact]
        }
        return ["mode": "composed", "layout": "row", "unicodeFallback": "💡 + 🏠", "layers": [
            ["kind": "pictogram", "emojiFallback": "💡", "svg": ##"<svg viewBox="0 0 24 24" fill="none" stroke="#1a1f1c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/></svg>"##],
            ["kind": "operator", "symbol": "+"],
            ["kind": "pictogram", "emojiFallback": "🏠", "svg": ##"<svg viewBox="0 0 24 24" fill="none" stroke="#1a1f1c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>"##]
        ]]
    }
    private let user: [String: Any] = ["id": "fixture-guest", "username": "Curious guest", "isGuest": true]

    func respond(to request: URLRequest) throws -> (Int, Data) {
        lock.lock(); defer { lock.unlock() }
        var status = 200
        let payload: [String: Any]
        switch request.url?.path {
        case "/api/puzzle/today":
            dailyRequestCount += 1
            if ProcessInfo.processInfo.arguments.contains("--ui-today-unavailable") { return (503, Data()) }
            if expiredResetFixture && dailyRequestCount > 1 && game.puzzleId == "fixture-lighthouse" {
                game = GameSession(puzzleId: "fixture-next-daily", puzzleDate: Self.nextDayKey)
            }
            let deadline = expiredResetFixture && dailyRequestCount == 1 ? expiredNextPuzzleTime : nextPuzzleTime
            let hints: [String]
            if ProcessInfo.processInfo.arguments.contains("--ui-no-hints") {
                hints = []
            } else if ProcessInfo.processInfo.arguments.contains("--ui-empty-study-hints") {
                hints = ["Read each clue from left to right.", "", "Name each picture plainly.", "  ", "Join the parts into one familiar word."]
            } else {
                hints = ["Read each clue from left to right.", "Name each picture plainly.", "Join the parts into one familiar word."]
            }
            payload = ["success": true, "puzzle": ["id": game.puzzleId, "puzzle": Self.visual["unicodeFallback"] ?? "💡 + 🏠", "puzzleType": "rebus", "difficulty": 5, "visual": Self.visual, "hints": hints, "date": game.puzzleDate], "puzzleDate": game.puzzleDate, "nextPuzzleTime": deadline]
        case "/api/puzzles/archive":
            payload = ["items": [
                ["id": "archive-lighthouse", "puzzle": "💡 + 🏠", "puzzleType": "rebus", "difficulty": 6, "visual": Self.visual, "hints": ["Read each clue from left to right.", "Name each picture plainly.", "Join the parts into one familiar word."], "date": "2026-10-25"],
                ["id": "archive-headheels", "puzzle": "HEAD over HEELS", "puzzleType": "wordplay", "difficulty": 7, "hints": ["Pay attention to position."], "date": "2026-10-24"]
            ], "nextCursor": NSNull()]
        case "/api/puzzles/practice/sample":
            payload = ["id": "archive-lighthouse", "puzzle": "💡 + 🏠", "puzzleType": "rebus", "difficulty": 6, "visual": Self.visual, "hints": ["Read each clue from left to right.", "Name each picture plainly.", "Join the parts into one familiar word."], "date": "2026-10-25"]
        case "/api/auth/guest/lazy", "/api/auth/session":
            payload = ["success": true, "authenticated": true, "user": user, "token": "fixture-token"]
        case "/api/puzzle/session":
            return (200, try JSONEncoder().encode(game))
        case "/api/user/stats":
            payload = ["success": true, "stats": ["totalGames": existingInstallFixture || game.gameOver ? 1 : 0, "wins": game.wasSuccessful == true ? 1 : 0, "streak": game.wasSuccessful == true ? 1 : 0, "maxStreak": game.wasSuccessful == true ? 1 : 0]]
        case "/api/user/progress":
            payload = journeyProgressPayload()
        case "/api/puzzles/quip":
            if ProcessInfo.processInfo.arguments.contains("--ui-quip-unavailable") { return (503, Data()) }
            if ProcessInfo.processInfo.arguments.contains("--ui-quip-fails-once") {
                quipRequestCount += 1
                if quipRequestCount == 1 { return (503, Data()) }
            }
            let reply = game.wasSuccessful == true ? "That connection deserves a little victory lap." : "That guess took the scenic route."
            return (200, Data(reply.utf8))
        case "/api/puzzles/solve-distribution":
            solveDistributionRequestCount += 1
            UserDefaults.standard.set(solveDistributionRequestCount, forKey: "uiFixtureDailySolvePulseRequestCount")
            if ProcessInfo.processInfo.arguments.contains("--ui-pulse-fails-once"), solveDistributionRequestCount == 1 {
                return (503, Data())
            }
            let available = !ProcessInfo.processInfo.arguments.contains("--ui-pulse-unavailable")
            payload = [
                "available": available,
                "minimumSolves": 20,
                "oneGuessPercent": available ? 15 : 0,
                "twoGuessesPercent": available ? 25 : 0,
                "threeGuessesPercent": available ? 25 : 0,
                "fourPlusPercent": available ? 35 : 0
            ]
        case "/api/puzzles/guess":
            if ProcessInfo.processInfo.arguments.contains("--ui-guess-unavailable") { return (503, Data()) }
            if game.gameOver {
                status = 409; payload = ["error": "This puzzle is already complete."]
            } else {
                let body = try JSONSerialization.jsonObject(with: bodyData(request)) as? [String: Any]
                let guess = body?["guess"] as? String ?? ""
                let correct = guess.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "lighthouse"
                let count = game.attempts.count + 1
                let finished = correct
                let phase = finished ? (correct ? "solved" : "exhausted") : count == 3 ? "score_locked" : count > 3 ? "continuing" : "scored"
                var result: [String: Any] = ["success": true, "correct": correct, "attemptsLeft": max(0, 3 - count), "maxAttempts": 3, "gameOver": finished, "attemptNumber": count, "phase": phase, "scoreLocked": count >= 3, "playMode": "extended"]
                result["similarity"] = correct ? 100 : 20
                result["reaction"] = ["tier": correct ? "correct" : finished ? "out" : "cold", "line": correct ? "You made the connection." : "A fresh angle might help."]
                result["wordResults"] = [["word": guess.uppercased(), "correct": correct, "similarity": correct ? 100 : 20]]
                if finished {
                    result["answer"] = "lighthouse"
                    result["explanation"] = "Light + house makes lighthouse: a beacon that helps ships find their way."
                }
                let response = try JSONDecoder().decode(GuessResponse.self, from: JSONSerialization.data(withJSONObject: result))
                game.apply(response, guess: guess)
                game.hintsUsed = body?["hintsUsed"] as? Int ?? 0
                payload = result
            }
        case "/api/puzzles/reveal":
            let guesses = game.attempts.map { ["guess": $0.guess, "correct": $0.correct, "attemptNumber": $0.attemptNumber] as [String: Any] }
            let result: [String: Any] = [
                "success": true,
                "puzzleId": game.puzzleId,
                "puzzleDate": game.puzzleDate,
                "phase": "revealed",
                "scoreLocked": true,
                "correct": false,
                "wasSuccessful": false,
                "gameOver": true,
                "attempts": guesses,
                "attemptsLeft": 0,
                "maxAttempts": 3,
                "answer": "lighthouse",
                "explanation": "Light + house makes lighthouse: a beacon that helps ships find their way.",
                "pointsEarned": 0
            ]
            if let decoded = try? JSONDecoder().decode(RevealResponse.self, from: JSONSerialization.data(withJSONObject: result)) {
                game.applyReveal(decoded)
            }
            payload = result
        case "/api/puzzles/practice/guess":
            let body = try JSONSerialization.jsonObject(with: bodyData(request)) as? [String: Any]
            let guess = body?["guess"] as? String ?? ""
            let attempt = body?["attemptNumber"] as? Int ?? 1
            let expectedPreviousToken = attempt > 1 ? "fixture-practice-round-\(attempt - 1)" : nil
            if body?["roundToken"] as? String != expectedPreviousToken {
                status = 409
                payload = ["success": false, "error": "This practice round has expired or no longer matches."]
                break
            }
            let correct = guess.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "lighthouse"
            let finished = correct || attempt >= 3
            var result: [String: Any] = [
                "success": true,
                "correct": correct,
                "similarity": correct ? 100 : 20,
                "attemptNumber": attempt,
                "attemptsLeft": max(0, 3 - attempt),
                "maxAttempts": 3,
                "gameOver": finished,
                "reaction": ["tier": correct ? "correct" : finished ? "out" : "cold", "line": correct ? "You made the connection." : "A fresh angle might help."],
                "wordResults": [["word": guess.uppercased(), "correct": correct, "similarity": correct ? 100 : 20]]
            ]
            if correct {
                result["answer"] = "lighthouse"
                result["explanation"] = "Light + house makes lighthouse: a beacon that helps ships find their way."
            } else {
                result["roundToken"] = "fixture-practice-round-\(attempt)"
            }
            payload = result
        case "/api/puzzles/practice/reveal":
            let body = try JSONSerialization.jsonObject(with: bodyData(request)) as? [String: Any]
            if body?["roundToken"] as? String == "fixture-practice-round-3" {
                payload = ["success": true, "puzzleId": "archive-lighthouse", "answer": "lighthouse", "explanation": "Light + house makes lighthouse: a beacon that helps ships find their way."]
            } else {
                status = 409
                payload = ["success": false, "error": "Finish the three-guess practice round before revealing its solution."]
            }
        case "/api/auth/logout": payload = ["success": true]
        case "/api/native/analytics": payload = ["success": true]
        default: status = 404; payload = ["error": "This route is not available in the UI fixture."]
        }
        return (status, try JSONSerialization.data(withJSONObject: payload))
    }

    private func journeyProgressPayload() -> [String: Any] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        calendar.firstWeekday = 2
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        let puzzleDate = formatter.date(from: game.puzzleDate) ?? Date()
        let week = calendar.dateInterval(of: .weekOfYear, for: puzzleDate) ?? DateInterval(start: puzzleDate, duration: 7 * 24 * 60 * 60)
        let completed = game.gameOver
        let solved = game.wasSuccessful == true
        let firstGuessSolve = solved && game.attempts.count == 1
        let unassistedSolve = solved && game.hintsUsed == 0
        let xp = completed ? 25 + (solved ? 75 : 0) + (firstGuessSolve ? 25 : 0) + (unassistedSolve ? 25 : 0) : 0
        var badges: [String] = []
        if completed { badges.append("first-finish") }
        if firstGuessSolve { badges.append("first-guess-solve") }

        return [
            "asOfPuzzleDate": game.puzzleDate,
            "currentWeekStart": formatter.string(from: week.start),
            "currentWeekEnd": formatter.string(from: week.end.addingTimeInterval(-24 * 60 * 60)),
            "summary": [
                "totalXP": xp,
                "level": xp / 300 + 1,
                "xpIntoLevel": xp % 300,
                "finishes": completed ? 1 : 0,
                "solves": solved ? 1 : 0,
                "firstGuessSolves": firstGuessSolve ? 1 : 0,
                "unassistedSolves": unassistedSolve ? 1 : 0,
                "completedThisWeek": completed ? 1 : 0,
                "badges": badges
            ],
            "recentEntries": [],
            "backfill": ["status": "complete"]
        ]
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
