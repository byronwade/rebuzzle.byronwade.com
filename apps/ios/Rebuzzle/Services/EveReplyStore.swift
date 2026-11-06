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
    private(set) var pendingAttempt: Int?
    private(set) var unavailableAttempts: Set<Int> = []
    private(set) var interruptedAttempts: Set<Int> = []
    @ObservationIgnored private let storage: LocalStore
    @ObservationIgnored private let transport: Transport
    @ObservationIgnored private var key: String?
    @ObservationIgnored private var puzzleID: String?
    @ObservationIgnored private var requestID = UUID()
    @ObservationIgnored private var work: Task<Void, Never>?
    @ObservationIgnored private var deadline: Task<Void, Never>?
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
        requestID = UUID()
        work?.cancel(); deadline?.cancel()
        work = nil; deadline = nil; pendingAttempt = nil
        unavailableAttempts = []; interruptedAttempts = []
        replies = [:]; key = nil; puzzleID = nil
    }
    @discardableResult func request(guess: Guess) -> Task<Void, Never>? {
        guard let puzzleID, let key, guess.reaction != nil else { return nil }
        if let pendingAttempt {
            markReplyInterrupted(pendingAttempt)
        }
        work?.cancel(); deadline?.cancel()
        let id = UUID()
        requestID = id
        pendingAttempt = guess.attemptNumber
        unavailableAttempts.remove(guess.attemptNumber)
        interruptedAttempts.remove(guess.attemptNumber)
        let transport = transport
        let scope = scope
        let task = Task { [weak self] in
            guard !Task.isCancelled else { return }
            var transportFailed = false
            do {
                try await transport(puzzleID, guess, scope) { [weak self] text in
                    guard let self, self.requestID == id, !Task.isCancelled else { return }
                    let reply = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !reply.isEmpty else { return }
                    self.replies[guess.attemptNumber] = reply
                    self.unavailableAttempts.remove(guess.attemptNumber)
                    self.interruptedAttempts.remove(guess.attemptNumber)
                }
            } catch {
                guard let self, self.requestID == id else { return }
                transportFailed = true
            }
            guard let self, self.requestID == id else { return }
            self.deadline?.cancel()
            self.deadline = nil
            self.pendingAttempt = nil
            if transportFailed {
                self.markReplyInterrupted(guess.attemptNumber)
            } else if self.hasReply(for: guess.attemptNumber) {
                self.unavailableAttempts.remove(guess.attemptNumber)
                self.interruptedAttempts.remove(guess.attemptNumber)
            } else {
                self.unavailableAttempts.insert(guess.attemptNumber)
                self.interruptedAttempts.remove(guess.attemptNumber)
            }
            if !self.replies.isEmpty { try? self.storage.save(self.replies, key: key) }
            self.work = nil
        }
        work = task
        deadline = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(4500)) } catch { return }
            guard let self, self.requestID == id else { return }
            self.work?.cancel()
            self.requestID = UUID()
            self.pendingAttempt = nil
            self.markReplyInterrupted(guess.attemptNumber)
            self.work = nil
            self.deadline = nil
            if !self.replies.isEmpty { try? self.storage.save(self.replies, key: key) }
        }
        return task
    }

    private func hasReply(for attempt: Int) -> Bool {
        guard let reply = replies[attempt] else { return false }
        return !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func markReplyInterrupted(_ attempt: Int) {
        if hasReply(for: attempt) {
            unavailableAttempts.remove(attempt)
            interruptedAttempts.insert(attempt)
        } else {
            unavailableAttempts.insert(attempt)
            interruptedAttempts.remove(attempt)
        }
    }
}
