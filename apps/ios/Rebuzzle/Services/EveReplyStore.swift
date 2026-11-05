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
    typealias NudgeFollowUpTransport = @MainActor @Sendable (String, Int) async throws -> String

    private struct StoredNudgeFollowUps: Codable {
        var requestedHintIndexes: Set<Int> = []
        var retryCounts: [Int: Int] = [:]
        var replies: [Int: String] = [:]
    }

    private(set) var replies: [Int: String] = [:]
    private(set) var pendingAttempts: Set<Int> = []
    private(set) var failedAttempts: Set<Int> = []
    private(set) var nudgeFollowUpReplies: [Int: String] = [:]
    private(set) var requestedNudgeFollowUpHintIndexes: Set<Int> = []
    private(set) var pendingNudgeFollowUpHintIndexes: Set<Int> = []
    private(set) var failedNudgeFollowUpHintIndexes: Set<Int> = []
    @ObservationIgnored private let storage: LocalStore
    @ObservationIgnored private let transport: Transport
    @ObservationIgnored private let nudgeFollowUpTransport: NudgeFollowUpTransport?
    @ObservationIgnored private var key: String?
    @ObservationIgnored private var nudgeFollowUpKey: String?
    @ObservationIgnored private var puzzleID: String?
    @ObservationIgnored private var requestIDs: [Int: UUID] = [:]
    @ObservationIgnored private var responseRequestIDs: [Int: UUID] = [:]
    @ObservationIgnored private var work: [Int: Task<Void, Never>] = [:]
    @ObservationIgnored private var deadlines: [Int: Task<Void, Never>] = [:]
    @ObservationIgnored private var nudgeFollowUpRetryCounts: [Int: Int] = [:]
    @ObservationIgnored private var nudgeFollowUpRequestIDs: [Int: UUID] = [:]
    @ObservationIgnored private var nudgeFollowUpWork: [Int: Task<Void, Never>] = [:]
    @ObservationIgnored private var nudgeFollowUpDeadlines: [Int: Task<Void, Never>] = [:]
    @ObservationIgnored private var scope: EveReplyScope = .daily

    init(
        storage: LocalStore,
        transport: @escaping Transport,
        nudgeFollowUpTransport: NudgeFollowUpTransport? = nil
    ) {
        self.storage = storage
        self.transport = transport
        self.nudgeFollowUpTransport = nudgeFollowUpTransport
    }
    func activate(accountID: String, puzzleID: String, scope: EveReplyScope = .daily) {
        // Keep the existing daily key so saved daily quips remain available after upgrading.
        let next = scope == .daily ? "eve:\(accountID):\(puzzleID)" : "eve:\(accountID):\(puzzleID):practice"
        guard next != key else { return }
        reset()
        key = next
        nudgeFollowUpKey = scope == .daily ? "eve-nudge-follow-up:\(accountID):\(puzzleID)" : nil
        self.puzzleID = puzzleID
        self.scope = scope
        replies = (try? storage.load([Int: String].self, key: next)) ?? [:]
        if let nudgeFollowUpKey,
           let saved = try? storage.load(StoredNudgeFollowUps.self, key: nudgeFollowUpKey) {
            nudgeFollowUpReplies = saved.replies
            requestedNudgeFollowUpHintIndexes = saved.requestedHintIndexes
            nudgeFollowUpRetryCounts = saved.retryCounts
            failedNudgeFollowUpHintIndexes = saved.requestedHintIndexes.subtracting(Set(saved.replies.keys))
        }
    }
    func reset() {
        work.values.forEach { $0.cancel() }
        deadlines.values.forEach { $0.cancel() }
        nudgeFollowUpWork.values.forEach { $0.cancel() }
        nudgeFollowUpDeadlines.values.forEach { $0.cancel() }
        requestIDs = [:]
        responseRequestIDs = [:]
        work = [:]
        deadlines = [:]
        nudgeFollowUpRequestIDs = [:]
        nudgeFollowUpWork = [:]
        nudgeFollowUpDeadlines = [:]
        pendingAttempts = []
        replies = [:]; failedAttempts = []; key = nil; puzzleID = nil
        nudgeFollowUpKey = nil
        nudgeFollowUpReplies = [:]
        requestedNudgeFollowUpHintIndexes = []
        pendingNudgeFollowUpHintIndexes = []
        failedNudgeFollowUpHintIndexes = []
        nudgeFollowUpRetryCounts = [:]
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

    @discardableResult func requestNudgeFollowUp(hintIndex: Int) -> Task<Void, Never>? {
        guard let puzzleID, nudgeFollowUpKey != nil, scope == .daily,
              nudgeFollowUpTransport != nil, hintIndex >= 0,
              !requestedNudgeFollowUpHintIndexes.contains(hintIndex),
              !pendingNudgeFollowUpHintIndexes.contains(hintIndex),
              nudgeFollowUpReplies[hintIndex] == nil else { return nil }
        requestedNudgeFollowUpHintIndexes.insert(hintIndex)
        saveNudgeFollowUpState()
        return startNudgeFollowUp(hintIndex: hintIndex, puzzleID: puzzleID)
    }

    @discardableResult func retryNudgeFollowUp(hintIndex: Int) -> Task<Void, Never>? {
        guard let puzzleID, nudgeFollowUpKey != nil, scope == .daily,
              nudgeFollowUpTransport != nil, hintIndex >= 0,
              requestedNudgeFollowUpHintIndexes.contains(hintIndex),
              failedNudgeFollowUpHintIndexes.contains(hintIndex),
              nudgeFollowUpRetryCounts[hintIndex, default: 0] < 1,
              !pendingNudgeFollowUpHintIndexes.contains(hintIndex),
              nudgeFollowUpReplies[hintIndex] == nil else { return nil }
        nudgeFollowUpRetryCounts[hintIndex, default: 0] += 1
        saveNudgeFollowUpState()
        return startNudgeFollowUp(hintIndex: hintIndex, puzzleID: puzzleID)
    }

    func canRetryNudgeFollowUp(hintIndex: Int) -> Bool {
        failedNudgeFollowUpHintIndexes.contains(hintIndex) &&
            nudgeFollowUpRetryCounts[hintIndex, default: 0] < 1 &&
            !pendingNudgeFollowUpHintIndexes.contains(hintIndex) &&
            nudgeFollowUpReplies[hintIndex] == nil
    }

    private func startNudgeFollowUp(hintIndex: Int, puzzleID: String) -> Task<Void, Never>? {
        guard let transport = nudgeFollowUpTransport else { return nil }
        let id = UUID()
        nudgeFollowUpRequestIDs[hintIndex] = id
        pendingNudgeFollowUpHintIndexes.insert(hintIndex)
        failedNudgeFollowUpHintIndexes.remove(hintIndex)

        let task = Task { [weak self] in
            var reply: String?
            do {
                let response = try await transport(puzzleID, hintIndex)
                let trimmed = response.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty { reply = trimmed }
            } catch {}

            guard let self, self.nudgeFollowUpRequestIDs[hintIndex] == id else { return }
            self.nudgeFollowUpDeadlines[hintIndex]?.cancel()
            self.nudgeFollowUpDeadlines[hintIndex] = nil
            self.pendingNudgeFollowUpHintIndexes.remove(hintIndex)
            self.nudgeFollowUpRequestIDs[hintIndex] = nil
            if let reply {
                self.nudgeFollowUpReplies[hintIndex] = reply
                self.failedNudgeFollowUpHintIndexes.remove(hintIndex)
            } else {
                self.failedNudgeFollowUpHintIndexes.insert(hintIndex)
            }
            self.saveNudgeFollowUpState()
            self.nudgeFollowUpWork[hintIndex] = nil
        }
        nudgeFollowUpWork[hintIndex] = task
        nudgeFollowUpDeadlines[hintIndex] = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(4500)) } catch { return }
            guard let self, self.nudgeFollowUpRequestIDs[hintIndex] == id else { return }
            self.nudgeFollowUpWork[hintIndex]?.cancel()
            self.nudgeFollowUpWork[hintIndex] = nil
            self.nudgeFollowUpRequestIDs[hintIndex] = nil
            self.pendingNudgeFollowUpHintIndexes.remove(hintIndex)
            self.failedNudgeFollowUpHintIndexes.insert(hintIndex)
            self.nudgeFollowUpDeadlines[hintIndex] = nil
            self.saveNudgeFollowUpState()
        }
        return task
    }

    private func saveNudgeFollowUpState() {
        guard let nudgeFollowUpKey else { return }
        let state = StoredNudgeFollowUps(
            requestedHintIndexes: requestedNudgeFollowUpHintIndexes,
            retryCounts: nudgeFollowUpRetryCounts,
            replies: nudgeFollowUpReplies
        )
        try? storage.save(state, key: nudgeFollowUpKey)
    }
}
