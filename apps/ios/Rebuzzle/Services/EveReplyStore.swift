import Foundation
import Observation
import RebuzzleCore

/// Optional presentation state, isolated from the authoritative game session.
@MainActor @Observable final class EveReplyStore {
    typealias Transport = @MainActor (String, Guess, @escaping @MainActor (String) -> Void) async throws -> Void
    private(set) var replies: [Int: String] = [:]
    private(set) var pendingAttempt: Int?
    @ObservationIgnored private let storage: LocalStore
    @ObservationIgnored private let transport: Transport
    @ObservationIgnored private var key: String?
    @ObservationIgnored private var puzzleID: String?
    @ObservationIgnored private var requestID = UUID()
    @ObservationIgnored private var work: Task<Void, Never>?
    @ObservationIgnored private var deadline: Task<Void, Never>?

    init(storage: LocalStore, transport: @escaping Transport) {
        self.storage = storage
        self.transport = transport
    }
    func activate(accountID: String, puzzleID: String) {
        let next = "eve:\(accountID):\(puzzleID)"
        guard next != key else { return }
        reset()
        key = next
        self.puzzleID = puzzleID
        replies = (try? storage.load([Int: String].self, key: next)) ?? [:]
    }
    func reset() {
        requestID = UUID()
        work?.cancel(); deadline?.cancel()
        work = nil; deadline = nil; pendingAttempt = nil
        replies = [:]; key = nil; puzzleID = nil
    }
    @discardableResult func request(guess: Guess) -> Task<Void, Never>? {
        guard let puzzleID, let key, guess.reaction != nil else { return nil }
        work?.cancel(); deadline?.cancel()
        let id = UUID()
        requestID = id
        pendingAttempt = guess.attemptNumber
        let transport = transport
        let task = Task { [weak self] in
            guard !Task.isCancelled else { return }
            do {
                try await transport(puzzleID, guess) { [weak self] text in
                    guard let self, self.requestID == id, !Task.isCancelled else { return }
                    self.replies[guess.attemptNumber] = text
                }
            } catch { /* Deterministic feedback remains available when Eve cannot reply. */ }
            guard let self, self.requestID == id else { return }
            self.deadline?.cancel()
            self.pendingAttempt = nil
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
            self.work = nil
            if !self.replies.isEmpty { try? self.storage.save(self.replies, key: key) }
        }
        return task
    }
}
