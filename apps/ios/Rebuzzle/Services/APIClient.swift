import Foundation
import RebuzzleCore

struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
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
    private struct ErrorBody: Decodable { let error: String? }
}
struct SuccessResponse: Decodable { let success: Bool }
