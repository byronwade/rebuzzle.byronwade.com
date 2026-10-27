import Foundation
import Darwin
import RebuzzleCore

struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}
enum DailyEntrySource: String, Hashable, Sendable {
    case app, notification, widget, shortcut
}

enum DailyQualityRating: String, CaseIterable, Identifiable, Sendable {
    case tooEasy = "too_easy"
    case justRight = "just_right"
    case toughButFair = "tough_but_fair"
    case unclear

    var id: String { rawValue }
}

enum GrowthEvent: Sendable {
    case dailyOpened(DailyEntrySource)
    case plusOfferViewed
    case reminderEnabled
    case dailyQualityFeedback(DailyQualityRating)

    var payload: [String: String] {
        switch self {
        case .dailyOpened(let source): ["eventType": "daily_opened", "source": source.rawValue]
        case .plusOfferViewed: ["eventType": "plus_offer_viewed"]
        case .reminderEnabled: ["eventType": "reminder_enabled"]
        case .dailyQualityFeedback(let rating): ["eventType": "daily_quality_feedback", "rating": rating.rawValue]
        }
    }
}

@MainActor final class APIClient {
    var token: String?
    var plusTransactionJWSProvider: (() -> String?)?
    let baseURL: URL
    private let session: URLSession
    private let deviceID: String
    private static let productionBaseURL = URL(string: "https://rebuzzle.byronwade.com")!

    static func resolvedBaseURL(from infoDictionary: [String: Any]) -> URL {
        guard let configuredURL = infoDictionary["RebuzzleAPIBaseURL"] as? String,
              configuredURL == configuredURL.trimmingCharacters(in: .whitespacesAndNewlines),
              let components = URLComponents(string: configuredURL),
              components.scheme?.lowercased() == "https",
              let host = components.host, !host.isEmpty,
              components.user == nil,
              components.password == nil,
              components.path.isEmpty || components.path == "/",
              components.query == nil,
              components.fragment == nil,
              let url = components.url,
              let normalizedHost = url.host,
              Self.hasValidAuthority(configuredURL, normalizedHost: normalizedHost) else {
            return productionBaseURL
        }
        return url
    }

    private static func hasValidAuthority(_ origin: String, normalizedHost: String) -> Bool {
        guard let schemeSeparator = origin.range(of: "://") else { return false }
        let authority = origin[schemeSeparator.upperBound...].prefix { !"/?#".contains($0) }
        guard !authority.isEmpty else { return false }

        if authority.first == "[" {
            guard let closingBracket = authority.firstIndex(of: "]"),
                  closingBracket > authority.startIndex else { return false }
            let addressStart = authority.index(after: authority.startIndex)
            let address = authority[addressStart..<closingBracket]
            var parsedAddress = in6_addr()
            guard address.withCString({ inet_pton(AF_INET6, $0, &parsedAddress) }) == 1 else { return false }

            let suffix = authority[authority.index(after: closingBracket)...]
            if suffix.isEmpty { return true }
            guard suffix.first == ":" else { return false }
            return isValidPort(suffix.dropFirst())
        }

        let authorityParts = authority.split(separator: ":", omittingEmptySubsequences: false)
        guard authorityParts.count <= 2, isValidDNSHostname(normalizedHost) else { return false }
        guard authorityParts.count == 2 else { return true }
        return isValidPort(authorityParts[1])
    }

    private static func isValidPort<S: StringProtocol>(_ port: S) -> Bool {
        guard !port.isEmpty,
              port.utf8.allSatisfy({ (48...57).contains($0) }),
              let number = Int(String(port)) else { return false }
        return (1...65_535).contains(number)
    }

    private static func isValidDNSHostname(_ host: String) -> Bool {
        var hostname = host
        if hostname.hasSuffix(".") { hostname.removeLast() }
        let hostnameBytes = hostname.utf8
        guard !hostnameBytes.isEmpty, hostnameBytes.count <= 253 else { return false }

        return hostname.split(separator: ".", omittingEmptySubsequences: false).allSatisfy { label in
            let bytes = Array(label.utf8)
            guard !bytes.isEmpty,
                  bytes.count <= 63,
                  bytes.first != 45,
                  bytes.last != 45 else { return false }
            return bytes.allSatisfy {
                (48...57).contains($0) || (65...90).contains($0) || (97...122).contains($0) || $0 == 45
            }
        }
    }

    init(baseURL: URL? = nil, deviceID: String, session: URLSession? = nil) {
        self.baseURL = baseURL ?? Self.resolvedBaseURL(from: Bundle.main.infoDictionary ?? [:])
        self.deviceID = deviceID
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 25
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        self.session = session ?? URLSession(configuration: config)
    }
    func request<T: Decodable>(_ path: String, method: String = "GET", body: [String: Any]? = nil, headers: [String: String] = [:]) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw APIError(status: 0, message: "This address could not be opened.") }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(deviceID, forHTTPHeaderField: "X-Device-Id")
        request.setValue("rebuzzle-tz=\(TimeZone.current.identifier)", forHTTPHeaderField: "Cookie")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if path.hasPrefix("/api/puzzles/guess") || path.hasPrefix("/api/puzzle/session") {
            request.setValue("true", forHTTPHeaderField: "X-Rebuzzle-Daily-Only")
        }
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }
        request.setValue("1", forHTTPHeaderField: "X-Rebuzzle-Canonical-Board")
        if url.path == "/api/puzzles/archive" || url.path.hasPrefix("/api/puzzles/practice/"),
           let transactionJWS = plusTransactionJWSProvider?() {
            request.setValue(transactionJWS, forHTTPHeaderField: "X-Rebuzzle-StoreKit-Transaction")
        }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError(status: 0, message: "The server did not respond. Try again when you’re connected.") }
        guard (200..<300).contains(http.statusCode) else {
            let error = try? JSONDecoder().decode(ErrorBody.self, from: data)
            let message = error?.error ?? (http.statusCode == 404 ? "This feature is not available on the server yet. Please try again later." : "Could not connect to Rebuzzle. Try again.")
            throw APIError(status: http.statusCode, message: message)
        }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw APIError(status: http.statusCode, message: "Rebuzzle sent an unexpected response. Your progress is safe; please try again.") }
    }
    func fetchJourneyProgress() async throws -> JourneyProgressSnapshot {
        try await request("/api/user/progress")
    }
    func fetchArchive(cursor: String? = nil, limit: Int = 20) async throws -> PuzzleArchivePage {
        var components = URLComponents(url: baseURL.appendingPathComponent("api/puzzles/archive"), resolvingAgainstBaseURL: false)
        var queryItems = [URLQueryItem(name: "limit", value: String(min(50, max(1, limit))))]
        if let cursor, !cursor.isEmpty { queryItems.append(URLQueryItem(name: "cursor", value: cursor)) }
        components?.queryItems = queryItems
        guard let url = components?.url else { throw APIError(status: 0, message: "The archive could not be opened. Please try again.") }
        return try await request(url.absoluteString)
    }
    func submitPracticeGuess(puzzleID: String, guess: String, attemptNumber: Int, roundToken: String?) async throws -> PracticeGuessResponse {
        var body: [String: Any] = ["puzzleId": puzzleID, "guess": guess, "attemptNumber": attemptNumber]
        if let roundToken { body["roundToken"] = roundToken }
        return try await request(
            "/api/puzzles/practice/guess",
            method: "POST",
            body: body,
            headers: ["X-Rebuzzle-Daily-Only": "false"]
        )
    }
    func revealPracticeSolution(puzzleID: String, roundToken: String) async throws -> PracticeRevealResponse {
        try await request(
            "/api/puzzles/practice/reveal",
            method: "POST",
            body: ["puzzleId": puzzleID, "roundToken": roundToken],
            headers: ["X-Rebuzzle-Daily-Only": "false"]
        )
    }
    /// Growth reporting is best-effort: telemetry must never interrupt a puzzle or purchase flow.
    func report(_ event: GrowthEvent) async {
        do {
            let _: SuccessResponse = try await request("/api/native/analytics", method: "POST", body: event.payload)
        } catch {
            // The server intentionally receives no retry queue or puzzle data.
        }
    }
    /// Eve is optional commentary; scoring remains exclusively in the guess endpoint.
    func streamQuip(puzzleID: String, guess: Guess, scope: EveReplyScope = .daily, onUpdate: @escaping @MainActor (String) -> Void) async throws {
        guard let tier = guess.reaction?.tier else { return }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/puzzles/quip"))
        request.httpMethod = "POST"
        request.timeoutInterval = 4.5
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/plain", forHTTPHeaderField: "Accept")
        request.setValue(deviceID, forHTTPHeaderField: "X-Device-Id")
        request.setValue("rebuzzle-tz=\(TimeZone.current.identifier)", forHTTPHeaderField: "Cookie")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if scope == .practice, let transactionJWS = plusTransactionJWSProvider?() {
            request.setValue(transactionJWS, forHTTPHeaderField: "X-Rebuzzle-StoreKit-Transaction")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["puzzleId": puzzleID, "guess": guess.guess, "tier": tier, "mode": scope.rawValue])
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        var pending = Data()
        var text = ""
        var count = 0
        for try await byte in bytes {
            try Task.checkCancellation()
            count += 1
            guard count <= 2048 else { break }
            pending.append(byte)
            // Decode only complete UTF-8 scalars so split emoji and punctuation survive.
            if let scalar = String(data: pending, encoding: .utf8) {
                text += scalar
                pending.removeAll(keepingCapacity: true)
                onUpdate(text)
            } else if pending.count > 4 {
                throw URLError(.cannotDecodeContentData)
            }
        }
    }
    private struct ErrorBody: Decodable { let error: String? }
}
struct SuccessResponse: Decodable { let success: Bool }
