import Foundation
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
    let baseURL: URL
    private let session: URLSession
    private let deviceID: String
    init(baseURL: URL = URL(string: "https://rebuzzle.byronwade.com")!, deviceID: String, session: URLSession? = nil) {
        self.baseURL = baseURL; self.deviceID = deviceID
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
    /// Growth reporting is best-effort: telemetry must never interrupt a puzzle or purchase flow.
    func report(_ event: GrowthEvent) async {
        do {
            let _: SuccessResponse = try await request("/api/native/analytics", method: "POST", body: event.payload)
        } catch {
            // The server intentionally receives no retry queue or puzzle data.
        }
    }
    /// Eve is optional commentary; scoring remains exclusively in the guess endpoint.
    func streamQuip(puzzleID: String, guess: Guess, onUpdate: @escaping @MainActor (String) -> Void) async throws {
        guard let tier = guess.reaction?.tier else { return }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/puzzles/quip"))
        request.httpMethod = "POST"
        request.timeoutInterval = 4.5
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/plain", forHTTPHeaderField: "Accept")
        request.setValue(deviceID, forHTTPHeaderField: "X-Device-Id")
        request.setValue("rebuzzle-tz=\(TimeZone.current.identifier)", forHTTPHeaderField: "Cookie")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["puzzleId": puzzleID, "guess": guess.guess, "tier": tier])
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
