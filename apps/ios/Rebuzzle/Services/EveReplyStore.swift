import Foundation
import Observation
import RebuzzleCore

enum EveReplyScope: String, Sendable {
    case daily
    case practice
}

/// Optional presentation state, isolated from the authoritative game session.
@MainActor @Observable final class EveReplyStore {
    typealias Transport = @MainActor @Sendable (String, Guess, EveReplyScope, @escaping @MainActor @Sendable (String) -> Void) async throws -> Void
    private(set) var replies: [Int: String] = [:]
    private(set) var pendingAttempts: Set<Int> = []
    private(set) var failedAttempts: Set<Int> = []
    @ObservationIgnored private let storage: LocalStore
    @ObservationIgnored private let transport: Transport
    @ObservationIgnored private var key: String?
    @ObservationIgnored private var puzzleID: String?
    @ObservationIgnored private var requestIDs: [Int: UUID] = [:]
    @ObservationIgnored private var responseRequestIDs: [Int: UUID] = [:]
    @ObservationIgnored private var work: [Int: Task<Void, Never>] = [:]
    @ObservationIgnored private var deadlines: [Int: Task<Void, Never>] = [:]
    @ObservationIgnored private var scope: EveReplyScope = .daily

    init(storage: LocalStore, transport: @escaping Transport) {
        self.storage = storage
        self.transport = transport
    }
    func activate(accountID: String, puzzleID: String, scope: EveReplyScope = .daily) {
        // Keep the existing daily key so saved daily quips remain available after upgrading.
        let next = scope == .daily ? "eve:\(accountID):\(puzzleID)" : "eve:\(accountID):\(puzzleID):practice"
        guard next != key else { return }
        reset()
        key = next
        self.puzzleID = puzzleID
        self.scope = scope
        replies = (try? storage.load([Int: String].self, key: next)) ?? [:]
    }
    func reset() {
        work.values.forEach { $0.cancel() }
        deadlines.values.forEach { $0.cancel() }
        requestIDs = [:]
        responseRequestIDs = [:]
        work = [:]
        deadlines = [:]
        pendingAttempts = []
        replies = [:]; failedAttempts = []; key = nil; puzzleID = nil
    }
    @discardableResult func retry(guess: Guess) -> Task<Void, Never>? {
        guard !pendingAttempts.contains(guess.attemptNumber), failedAttempts.contains(guess.attemptNumber) else { return nil }
        return request(guess: guess)
    }
    @discardableResult func request(guess: Guess) -> Task<Void, Never>? {
        guard let puzzleID, let key, guess.reaction != nil else { return nil }
        let attempt = guess.attemptNumber
        guard !pendingAttempts.contains(attempt) else { return nil }
        let id = UUID()
        requestIDs[attempt] = id
        pendingAttempts.insert(attempt)
        failedAttempts.remove(attempt)
        let transport = transport
        let scope = scope
        let task = Task { [weak self] in
            guard !Task.isCancelled else { return }
            var transportFailed = false
            do {
                try await transport(puzzleID, guess, scope) { [weak self] text in
                    guard let self, self.requestIDs[attempt] == id, !Task.isCancelled else { return }
                    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                    self.replies[attempt] = text
                    self.responseRequestIDs[attempt] = id
                }
            } catch { transportFailed = true }
            guard let self, self.requestIDs[attempt] == id else { return }
            self.deadlines[attempt]?.cancel()
            self.deadlines[attempt] = nil
            self.pendingAttempts.remove(attempt)
            self.requestIDs[attempt] = nil
            if transportFailed || self.responseRequestIDs[attempt] != id {
                self.failedAttempts.insert(attempt)
            } else {
                self.failedAttempts.remove(attempt)
            }
            if !self.replies.isEmpty { try? self.storage.save(self.replies, key: key) }
            self.work[attempt] = nil
        }
        work[attempt] = task
        deadlines[attempt] = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(4500)) } catch { return }
            guard let self, self.requestIDs[attempt] == id else { return }
            self.work[attempt]?.cancel()
            self.work[attempt] = nil
            self.requestIDs[attempt] = nil
            self.pendingAttempts.remove(attempt)
            self.failedAttempts.insert(attempt)
            self.deadlines[attempt] = nil
            if !self.replies.isEmpty { try? self.storage.save(self.replies, key: key) }
        }
        return task
    }
}
