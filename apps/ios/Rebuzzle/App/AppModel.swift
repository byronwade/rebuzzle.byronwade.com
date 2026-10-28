import Foundation
import Observation
import RebuzzleCore

enum CompletedStreakRefreshState: Equatable {
    case idle
    case refreshing(puzzleID: String, celebrates: Bool)
    case fresh(puzzleID: String, celebrates: Bool)
    case failed(puzzleID: String)
}

enum JournalSyncStatus: Equatable {
    case onDevice
    case syncing
    case synced
    case offline
    case historyArriving
    case conflict
}

@MainActor @Observable final class AppModel {
    var selectedTab: AppTab = .play
    var completedCurrentPuzzle: Bool {
        guard game?.gameOver == true, let raw = daily?.nextPuzzleTime,
              let expiry = DailyReturnTiming.deadline(raw) else { return false }
        return expiry > Date()
    }
    var canSaveDailyThought: Bool {
        guard dailyThoughtAvailable, sessionReady, player != nil, let daily, let game, !game.gameOver,
              let expiry = DailyReturnTiming.deadline(daily.nextPuzzleTime) else { return false }
        return expiry > Date()
    }
    var daily: DailyResponse?
    var game: GameSession?
    var player: Player?
    var journal = Journal()
    var journalSyncStatus: JournalSyncStatus = .onDevice
    var journalSyncConflicts: [JournalSyncConflict] {
        journalSyncCheckpoint.entries.compactMap { puzzleID, value in
            guard let remote = value.remoteConflict,
                  let local = journal.entries.first(where: { $0.puzzleID == puzzleID }) else { return nil }
            return JournalSyncConflict(
                puzzleID: puzzleID,
                localNote: local.note,
                accountNote: remote.note,
                accountRevision: remote.revision
            )
        }.sorted { $0.puzzleID < $1.puzzleID }
    }
    var stats: PlayerStats?
    var completedStreakRefreshState: CompletedStreakRefreshState = .idle
    var journeySnapshot: JourneyProgressSnapshot?
    var journeySyncError: String?
    var journeySyncing = false
    var draft = ""
    var dailyThought = ""
    private(set) var dailyThoughtAvailable = false
    var busy = false
    var submitting = false
    var error: String?
    var storageError: String?
    var accountError: String?
    var needsReconciliation = false
    var sessionReady = false
    private var journalWritable = false
    @ObservationIgnored private var journalSyncCheckpoint = JournalSyncCheckpoint()
    @ObservationIgnored private var journalHistoryComplete = true
    @ObservationIgnored private var journalSyncTask: Task<Void, Never>?
    @ObservationIgnored private var journalSyncRunGeneration: Int?
    @ObservationIgnored private var dailyThoughtExpiryTask: Task<Void, Never>?
    @ObservationIgnored private let journalPlusEntitlementProvider: @MainActor () -> Bool
    var hintsShown = 0
    private(set) var nudgeReveals: [DailyNudgeReveal] = []
    let eve: EveReplyStore
    let purchases: PurchaseStore
    let reminders = ReminderStore()
    @ObservationIgnored let storage: LocalStore
    @ObservationIgnored let credentials: CredentialStore
    @ObservationIgnored private var started = Date()
    @ObservationIgnored private var initialSetupError: String?
    @ObservationIgnored private var generation = 0
    @ObservationIgnored private var journeyIdentityID: String?
    @ObservationIgnored private var journeyRefreshGeneration = 0
    @ObservationIgnored private var pendingEntrySource: DailyEntrySource?
    @ObservationIgnored let api: APIClient

    init(
        api: APIClient? = nil,
        storage: LocalStore? = nil,
        credentials: CredentialStore = CredentialStore(),
        journalPlusEntitlementProvider: (@MainActor () -> Bool)? = nil
    ) {
        self.storage = storage ?? LocalStore()
        self.credentials = credentials
        let purchaseStore = PurchaseStore()
        self.purchases = purchaseStore
        self.journalPlusEntitlementProvider = journalPlusEntitlementProvider ?? { purchaseStore.hasPlus }
        var device = UUID().uuidString
        let secure = credentials
        do {
            if let saved = try secure.read("device") { device = saved }
            else { try secure.write(device, key: "device") }
        } catch { initialSetupError = error.localizedDescription }
        let client = api ?? APIClient(deviceID: device)
        self.api = client
        self.eve = EveReplyStore(storage: self.storage) { puzzleID, guess, scope, update in
            try await client.streamQuip(puzzleID: puzzleID, guess: guess, scope: scope, onUpdate: update)
        }
        client.plusTransactionJWSProvider = { [weak purchases = self.purchases] in
            purchases?.plusTransactionJWS
        }
        do { self.api.token = try secure.read("token") } catch { initialSetupError = error.localizedDescription }
        self.purchases.onGrowthEvent = { [weak self] event in
            if case .plusPurchaseVerified = event { return }
            self?.recordGrowthEvent(event)
        }
        self.purchases.purchaseAccountIDProvider = { [weak self] in self?.player?.id }
        self.purchases.onPlusActivated = { [weak self] in
            Task { @MainActor [weak self] in await self?.syncJournal() }
        }
        self.purchases.onVerifiedPurchase = { [weak self] event, accountID in
            guard let self else { return false }
            return await self.reportGrowthEventWhenAuthenticated(event, expectedAccountID: accountID)
        }
    }
    func load(entrySource: DailyEntrySource = .app) async {
        if entrySource != .app || pendingEntrySource == nil {
            pendingEntrySource = entrySource
        }
        guard !busy, !submitting else { return }
        busy = true; error = nil
        defer { busy = false }
        if let initialSetupError { error = initialSetupError; return }
        do {
            let response: DailyResponse = try await api.request("/api/puzzle/today")
            if daily?.puzzle.id != response.puzzle.id {
                clearDailyThought(for: daily)
                eve.reset()
                game = nil; sessionReady = false; draft = ""; dailyThought = ""; dailyThoughtAvailable = false; hintsShown = 0; nudgeReveals = []; started = Date()
                completedStreakRefreshState = .idle
            }
            daily = response
            try? storage.save(response, key: "daily-cache")
            try await authenticate()
            synchronizeDailyThoughtPuzzle(for: response.puzzle.id)
            purchases.retryPendingPurchaseAttribution()
            if !journalWritable { try loadJournal() }
            try await restore()
            if journalPlusEntitlementProvider() { await syncJournal() }
            let completedPuzzleID = game?.gameOver == true ? game?.puzzleId : nil
            await refreshPlayerStats(forCompletedPuzzleID: completedPuzzleID, celebrates: false)
            try? await reminders.schedule(completedToday: completedCurrentPuzzle)
            if sessionReady {
                let source = pendingEntrySource ?? entrySource
                pendingEntrySource = nil
                recordGrowthEvent(.dailyOpened(source))
            }
        } catch {
            self.error = error.localizedDescription
            if daily == nil { daily = try? storage.load(DailyResponse.self, key: "daily-cache") }
            sessionReady = false
        }
    }
    private func authenticate() async throws {
        if api.token != nil {
            do {
                let response: AuthResponse = try await api.request("/api/auth/session")
                if response.authenticated == true, let user = response.user {
                    if player?.id != user.id {
                        generation += 1
                        dailyThoughtExpiryTask?.cancel(); dailyThoughtExpiryTask = nil
                        eve.reset(); game = nil; sessionReady = false; draft = ""; dailyThought = ""; dailyThoughtAvailable = false; hintsShown = 0; nudgeReveals = []; stats = nil
                        completedStreakRefreshState = .idle
                    }
                    player = user
                    loadJourneyCache(for: user.id)
                    try credentials.write(user.guest ? "guest" : "member", key: "identity-kind")
                    try loadJournal()
                    return
                }
            } catch {
                guard (error as? APIError)?.status == 401 else { throw error }
            }
            guard try credentials.read("identity-kind") == "guest" else {
                throw APIError(status: 401, message: "Your session has expired. Sign in again in Settings to continue.")
            }
            // Keep the old guest bearer on the renewal request: a still-valid token
            // whose guest identity was converted must reach the server so it can
            // prompt for sign-in instead of silently creating a second guest.
        }
        let response: AuthResponse = try await api.request("/api/auth/guest/lazy", method: "POST", body: [:])
        guard let user = response.user, let token = response.token else {
            throw APIError(status: 401, message: "Guest play could not start. Please try again later or sign in.")
        }
        try credentials.write(token, key: "token")
        try credentials.write(user.guest ? "guest" : "member", key: "identity-kind")
        if player?.id != user.id {
            generation += 1
            dailyThoughtExpiryTask?.cancel(); dailyThoughtExpiryTask = nil
            eve.reset(); game = nil; sessionReady = false; draft = ""; dailyThought = ""; dailyThoughtAvailable = false; hintsShown = 0; nudgeReveals = []; stats = nil
            completedStreakRefreshState = .idle
        }
        api.token = token; player = user
        loadJourneyCache(for: user.id)
        try loadJournal()
    }
    func restore() async throws {
        guard let daily, let player else { return }
        let encoded = daily.puzzle.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? daily.puzzle.id
        let restored: GameSession = try await api.request("/api/puzzle/session?puzzleId=\(encoded)")
        guard restored.puzzleId == daily.puzzle.id else { throw APIError(status: 0, message: "The puzzle changed. Reload today’s puzzle to continue.") }
        eve.activate(accountID: player.id, puzzleID: daily.puzzle.id)
        game = restored
        let hintKey = "hints:\(player.id):\(daily.puzzle.id)"
        hintsShown = min(daily.puzzle.hints.count, max(0, max(restored.hintsUsed, (try? storage.load(Int.self, key: hintKey)) ?? 0)))
        let nudgeKey = "nudge-turns:\(player.id):\(daily.puzzle.id)"
        let savedReveals = (try? storage.load([DailyNudgeReveal].self, key: nudgeKey)) ?? []
        nudgeReveals = DailyConversationTimeline.reconcile(
            savedReveals,
            revealedHintCount: hintsShown,
            attemptCount: restored.attempts.count
        )
        if !nudgeReveals.isEmpty, nudgeReveals != savedReveals {
            do { try storage.save(nudgeReveals, key: nudgeKey) }
            catch { storageError = "Your hint progress could not be saved on this device." }
        }
        draft = storage.draft(account: player.id, puzzle: daily.puzzle.id)
        needsReconciliation = false; sessionReady = true
        restoreDailyThought()
        recordCompletion()
        scheduleJourneyRefresh()
    }
    private func loadJourneyCache(for userID: String) {
        guard journeyIdentityID != userID else { return }
        journeyRefreshGeneration += 1
        journeyIdentityID = userID
        journeySnapshot = try? storage.load(JourneyProgressSnapshot.self, key: "journey:\(userID)")
        journeySyncError = nil
        journeySyncing = false
    }
    private func scheduleJourneyRefresh() {
        guard player != nil else { return }
        Task { await refreshJourneyProgress() }
    }
    func recordGrowthEvent(_ event: GrowthEvent) {
        guard let userID = player?.id, let token = api.token else { return }
        Task { @MainActor [weak self] in
            guard let self, self.player?.id == userID, self.api.token == token else { return }
            await self.api.report(event)
        }
    }
    private func reportGrowthEventWhenAuthenticated(_ event: GrowthEvent, expectedAccountID: String) async -> Bool {
        guard player?.id == expectedAccountID, api.token != nil else { return false }
        return await api.report(event)
    }
    func refreshJourneyProgress() async {
        guard let userID = player?.id else { return }
        journeyRefreshGeneration += 1
        let requestGeneration = journeyRefreshGeneration
        journeySyncing = true
        do {
            let snapshot = try await api.fetchJourneyProgress()
            try? storage.save(snapshot, key: "journey:\(userID)")
            guard requestGeneration == journeyRefreshGeneration, player?.id == userID else { return }
            journeySnapshot = snapshot
            journeySyncError = nil
            journeySyncing = false
        } catch {
            guard requestGeneration == journeyRefreshGeneration, player?.id == userID else { return }
            journeySyncError = error.localizedDescription
            journeySyncing = false
        }
    }
    func submit() async {
        guard !submitting, !busy, sessionReady, let daily, let player, game?.gameOver == false else { return }
        guard let expiry = ResultView.date(daily.nextPuzzleTime), expiry > Date() else {
            await load()
            error = "A new daily puzzle is ready. Take a look before submitting."
            return
        }
        let guess = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !guess.isEmpty else { error = "Write your answer first, then check it."; return }
        guard guess.count <= 200 else { error = "Keep your answer to 200 characters or fewer."; return }
        submitting = true; error = nil
        defer { submitting = false }
        let run = generation
        do {
            if needsReconciliation {
                try await restore()
                error = "Progress refreshed. Review your guesses before checking another answer."
                return
            }
            let result: GuessResponse = try await api.request("/api/puzzles/guess", method: "POST", body: ["puzzleId": daily.puzzle.id, "guess": guess, "playMode": "extended", "hintsUsed": hintsShown, "consecutiveCold": game?.attempts.reversed().prefix(while: { $0.reaction?.tier == "cold" }).count ?? 0, "timeSpentSeconds": max(0, Int(Date().timeIntervalSince(started)))])
            guard run == generation else { return }
            if result.gameOver {
                completedStreakRefreshState = .refreshing(puzzleID: daily.puzzle.id, celebrates: true)
            }
            game?.apply(result, guess: guess)
            game?.hintsUsed = hintsShown
            if game?.gameOver == true { clearDailyThought() }
            eve.activate(accountID: player.id, puzzleID: daily.puzzle.id)
            if let confirmed = game?.attempts.last { eve.request(guess: confirmed) }
            draft = ""
            try storage.saveDraft("", account: player.id, puzzle: daily.puzzle.id)
            recordCompletion()
            if game?.gameOver == true {
                try? await reminders.schedule(completedToday: true)
                await refreshPlayerStats(forCompletedPuzzleID: daily.puzzle.id, celebrates: true)
                scheduleJourneyRefresh()
            }
        } catch {
            guard run == generation else { return }
            needsReconciliation = true
            self.error = "We couldn’t confirm that response. Refresh progress before trying again."
        }
    }
    func revealAnswer() async {
        guard !submitting, !busy, sessionReady, let daily, game?.gameOver == false else { return }
        guard let expiry = ResultView.date(daily.nextPuzzleTime), expiry > Date() else {
            await load()
            error = "A new daily puzzle is ready. Take a look before revealing yesterday’s answer."
            return
        }
        submitting = true
        error = nil
        defer { submitting = false }
        let run = generation
        do {
            if needsReconciliation {
                try await restore()
                error = "Progress refreshed. Review the puzzle before revealing its answer."
                return
            }
            let result: RevealResponse = try await api.request(
                "/api/puzzles/reveal",
                method: "POST",
                body: ["puzzleId": daily.puzzle.id]
            )
            guard run == generation else { return }
            guard result.puzzleId == daily.puzzle.id else {
                throw APIError(status: 0, message: "The puzzle changed. Refresh today’s progress before continuing.")
            }
            completedStreakRefreshState = .refreshing(puzzleID: daily.puzzle.id, celebrates: false)
            game?.applyReveal(result)
            game?.hintsUsed = hintsShown
            clearDailyThought()
            recordCompletion()
            try? await reminders.schedule(completedToday: true)
            await refreshPlayerStats(forCompletedPuzzleID: daily.puzzle.id, celebrates: false)
            scheduleJourneyRefresh()
        } catch {
            guard run == generation else { return }
            needsReconciliation = true
            self.error = "We couldn’t confirm the reveal. Refresh progress before trying again."
        }
    }
    func reconcile() async {
        guard !busy, !submitting else { return }
        busy = true; defer { busy = false }
        do { try await restore(); error = nil }
        catch { self.error = error.localizedDescription }
    }
    func streakPresentation(for game: GameSession) -> DailyStreakPresentation {
        let freshness: DailyStreakFreshness
        let celebratesMilestone: Bool
        switch completedStreakRefreshState {
        case let .refreshing(puzzleID, _ ) where puzzleID == game.puzzleId:
            freshness = .syncing
            celebratesMilestone = false
        case let .fresh(puzzleID, celebrates) where puzzleID == game.puzzleId:
            freshness = .fresh
            celebratesMilestone = celebrates
        case let .failed(puzzleID) where puzzleID == game.puzzleId:
            freshness = .unavailable
            celebratesMilestone = false
        default:
            freshness = .syncing
            celebratesMilestone = false
        }
        return DailyStreakPresentation.result(
            wasSolved: game.wasSuccessful == true,
            stats: freshness == .fresh ? stats : nil,
            freshness: freshness,
            celebratesMilestone: celebratesMilestone
        )
    }
    private func refreshPlayerStats(forCompletedPuzzleID puzzleID: String?, celebrates: Bool) async {
        let requestGeneration = generation
        let requestUserID = player?.id
        if let puzzleID {
            completedStreakRefreshState = .refreshing(puzzleID: puzzleID, celebrates: celebrates)
        }
        do {
            let result: StatsResponse = try await api.request("/api/user/stats")
            guard requestGeneration == generation, player?.id == requestUserID else { return }
            if let puzzleID, game?.puzzleId != puzzleID { return }
            guard result.success else { throw APIError(status: 0, message: "Streak progress could not be refreshed.") }
            stats = result.stats
            if let puzzleID {
                completedStreakRefreshState = .fresh(puzzleID: puzzleID, celebrates: celebrates)
            }
        } catch {
            guard requestGeneration == generation, player?.id == requestUserID else { return }
            if let puzzleID {
                guard game?.puzzleId == puzzleID else { return }
                completedStreakRefreshState = .failed(puzzleID: puzzleID)
            }
        }
    }
    func refreshStreakProgress() async {
        await refreshPlayerStats(
            forCompletedPuzzleID: game?.gameOver == true ? game?.puzzleId : nil,
            celebrates: false
        )
    }
    func revealHint() {
        guard let daily, let player, sessionReady, game?.gameOver == false, hintsShown < daily.puzzle.hints.count else { return }
        nudgeReveals.append(DailyNudgeReveal(hintIndex: hintsShown, afterAttemptCount: game?.attempts.count ?? 0))
        hintsShown += 1
        do { try storage.save(hintsShown, key: "hints:\(player.id):\(daily.puzzle.id)") }
        catch { storageError = "Your hint progress could not be saved on this device." }
        do { try storage.save(nudgeReveals, key: "nudge-turns:\(player.id):\(daily.puzzle.id)") }
        catch { storageError = "Your hint progress could not be saved on this device." }
    }
    func saveDraft() {
        guard let player, let daily else { return }
        do { try storage.saveDraft(draft, account: player.id, puzzle: daily.puzzle.id) }
        catch { storageError = "Your draft could not be saved on this device." }
    }
    func saveDailyThought(_ thought: String) {
        guard let player, let daily else {
            dailyThought = ""
            return
        }
        guard sessionReady, game?.gameOver == false,
              let expiry = DailyReturnTiming.deadline(daily.nextPuzzleTime), expiry > Date() else {
            clearDailyThought(for: daily)
            return
        }
        let boundedThought = String(thought.prefix(600))
        dailyThought = boundedThought
        do {
            if boundedThought.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                try storage.removeDailyThought(account: player.id, puzzle: daily.puzzle.id)
            } else {
                try storage.saveDailyThought(boundedThought, account: player.id, puzzle: daily.puzzle.id)
            }
        } catch {
            storageError = "Your thought could not be saved on this device."
        }
    }
    private func restoreDailyThought() {
        dailyThoughtExpiryTask?.cancel()
        dailyThoughtExpiryTask = nil
        dailyThoughtAvailable = false
        guard let player, let daily, game?.gameOver == false,
              let expiry = DailyReturnTiming.deadline(daily.nextPuzzleTime), expiry > Date() else {
            clearDailyThought()
            return
        }
        dailyThought = storage.dailyThought(account: player.id, puzzle: daily.puzzle.id)
        dailyThoughtAvailable = true
        let accountID = player.id
        let puzzleID = daily.puzzle.id
        let delay = expiry.timeIntervalSinceNow
        dailyThoughtExpiryTask = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: .seconds(delay)) }
            catch { return }
            guard let self, self.player?.id == accountID, self.daily?.puzzle.id == puzzleID else { return }
            self.clearDailyThought(for: self.daily)
        }
    }
    private func synchronizeDailyThoughtPuzzle(for puzzleID: String) {
        guard let player else { return }
        if let previousPuzzleID = storage.lastDailyPuzzle(account: player.id), previousPuzzleID != puzzleID {
            do { try storage.removeDailyThought(account: player.id, puzzle: previousPuzzleID) }
            catch { storageError = "Your previous puzzle thought could not be cleared on this device." }
        }
        do { try storage.saveLastDailyPuzzle(puzzleID, account: player.id) }
        catch { storageError = "Your current puzzle could not be saved on this device." }
    }
    private func clearDailyThought(for puzzle: DailyResponse? = nil) {
        dailyThoughtExpiryTask?.cancel()
        dailyThoughtExpiryTask = nil
        dailyThoughtAvailable = false
        let targetDaily = puzzle ?? daily
        guard let player, let targetDaily else { dailyThought = ""; return }
        dailyThought = ""
        do { try storage.removeDailyThought(account: player.id, puzzle: targetDaily.puzzle.id) }
        catch { storageError = "Your completed puzzle thought could not be cleared on this device." }
    }
    private func loadJournal() throws {
        journalWritable = false
        journal = Journal()
        journalSyncCheckpoint = JournalSyncCheckpoint()
        journalHistoryComplete = true
        guard let player else { return }
        journal = try storage.load(Journal.self, key: "journal:\(player.id)") ?? Journal()
        journalSyncCheckpoint = try storage.load(JournalSyncCheckpoint.self, key: "journal-sync:\(player.id)") ?? JournalSyncCheckpoint()
        journalSyncStatus = journalSyncCheckpoint.entries.values.contains(where: { $0.remoteConflict != nil }) ? .conflict : .onDevice
        journalWritable = true
    }
    func saveJournal() {
        guard let player, journalWritable else { return }
        do { try storage.save(journal, key: "journal:\(player.id)"); storageError = nil }
        catch { storageError = "Your journal could not be saved. Export a copy before leaving." }
        scheduleJournalSync()
    }
    private var canSyncJournal: Bool {
        guard let player else { return false }
        return !player.guest && api.token != nil && journalPlusEntitlementProvider()
    }

    private func scheduleJournalSync() {
        guard canSyncJournal else {
            if journalSyncRunGeneration == nil { journalSyncStatus = .onDevice }
            return
        }
        journalSyncTask?.cancel()
        journalSyncTask = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: .milliseconds(650)) } catch { return }
            await self?.syncJournal()
        }
    }

    func syncJournal() async {
        guard canSyncJournal, journalSyncRunGeneration != generation, let userID = player?.id else { return }
        let requestGeneration = generation
        journalSyncTask = nil
        journalSyncRunGeneration = requestGeneration
        journalSyncStatus = .syncing
        var failedStatus: JournalSyncStatus?
        defer {
            if journalSyncRunGeneration == requestGeneration { journalSyncRunGeneration = nil }
            if requestGeneration == generation, player?.id == userID {
                if let failedStatus {
                    journalSyncStatus = failedStatus
                } else if !journalSyncConflicts.isEmpty {
                    journalSyncStatus = .conflict
                } else if hasPendingJournalWrites {
                    journalSyncStatus = .offline
                    scheduleJournalSync()
                } else if journalHistoryComplete == false {
                    journalSyncStatus = .historyArriving
                } else {
                    journalSyncStatus = .synced
                }
            }
        }

        do {
            let remote = try await api.fetchJournal()
            guard requestGeneration == generation, player?.id == userID else { return }
            let pendingWrites = applyJournalReconciliation(remote)

            for write in pendingWrites {
                guard requestGeneration == generation, player?.id == userID else { return }
                do {
                    let saved = try await api.saveJournalNote(write)
                    guard requestGeneration == generation, player?.id == userID else { return }
                    JournalSyncReconciler.markSaved(write, revision: saved.revision, checkpoint: &journalSyncCheckpoint)
                    persistJournalAndCheckpoint(for: userID)
                } catch let error as APIError where error.status == 409 {
                    let refreshed = try await api.fetchJournal()
                    guard requestGeneration == generation, player?.id == userID else { return }
                    _ = applyJournalReconciliation(refreshed)
                    break
                }
            }
        } catch {
            guard requestGeneration == generation, player?.id == userID else { return }
            failedStatus = (error as? APIError)?.status == 403 ? .onDevice : .offline
            journalSyncStatus = failedStatus ?? .offline
        }
    }

    func retryJournalSyncIfNeeded() async {
        guard canSyncJournal, journalSyncRunGeneration != generation else { return }
        switch journalSyncStatus {
        case .onDevice, .offline, .historyArriving:
            await syncJournal()
        case .syncing, .synced, .conflict:
            return
        }
    }

    private var hasPendingJournalWrites: Bool {
        journal.entries.contains { entry in
            guard !entry.note.isEmpty,
                  let baseline = journalSyncCheckpoint.entries[entry.puzzleID],
                  baseline.remoteConflict == nil else { return false }
            return baseline.lastSyncedNote != entry.note
        } || journalSyncCheckpoint.entries.contains { puzzleID, baseline in
            guard baseline.remoteConflict == nil,
                  let local = journal.entries.first(where: { $0.puzzleID == puzzleID }) else { return false }
            return !baseline.lastSyncedNote.isEmpty && local.note.isEmpty
        }
    }

    @discardableResult
    private func applyJournalReconciliation(_ remote: JournalFetchResult) -> [JournalSyncNoteWrite] {
        let reconciled = JournalSyncReconciler.reconcile(
            local: journal,
            checkpoint: journalSyncCheckpoint,
            remote: remote.entries
        )
        journal = reconciled.journal
        journalSyncCheckpoint = reconciled.checkpoint
        journalHistoryComplete = remote.historyStatus == "complete"
        guard let userID = player?.id else { return reconciled.pendingWrites }
        persistJournalAndCheckpoint(for: userID)
        return reconciled.pendingWrites
    }

    private func persistJournalAndCheckpoint(for userID: String) {
        do {
            try storage.save(journal, key: "journal:\(userID)")
            try storage.save(journalSyncCheckpoint, key: "journal-sync:\(userID)")
            storageError = nil
        } catch {
            storageError = "Your journal could not be saved on this device. Export a copy before leaving."
        }
    }

    func resolveJournalConflict(puzzleID: String, choice: JournalSyncConflictChoice) {
        guard let userID = player?.id else { return }
        let write = JournalSyncReconciler.resolve(
            puzzleID: puzzleID,
            choice: choice,
            journal: &journal,
            checkpoint: &journalSyncCheckpoint
        )
        persistJournalAndCheckpoint(for: userID)
        if !journalSyncConflicts.isEmpty {
            journalSyncStatus = .conflict
        } else if write != nil {
            journalSyncStatus = .onDevice
            scheduleJournalSync()
        } else {
            journalSyncStatus = canSyncJournal ? (journalHistoryComplete ? .synced : .historyArriving) : .onDevice
        }
    }

    private func recordCompletion() {
        guard journalWritable, let game, game.gameOver, let answer = game.revealedAnswer, let daily else { return }
        journal.record(JournalEntry(puzzleID: daily.puzzle.id, puzzleDate: game.puzzleDate, puzzleType: daily.puzzle.puzzleType, clue: daily.puzzle.clue, answer: answer, explanation: game.explanation ?? "", won: game.wasSuccessful == true, attempts: game.attempts.count, hintsUsed: hintsShown, visual: daily.puzzle.visual, hints: daily.puzzle.hints))
        saveJournal()
    }
    func signIn(email: String, password: String) async -> Bool {
        guard !busy, !submitting else { return false }
        busy = true; accountError = nil; defer { busy = false }
        do {
            let auth: AuthResponse = try await api.request("/api/auth/login", method: "POST", body: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
            guard let token = auth.token, let user = auth.user else { throw APIError(status: 401, message: "Sign-in could not be completed.") }
            try credentials.write(token, key: "token")
            try credentials.write("member", key: "identity-kind")
            if player?.id != user.id {
                dailyThoughtExpiryTask?.cancel(); dailyThoughtExpiryTask = nil
                dailyThought = ""; dailyThoughtAvailable = false
            }
            eve.reset()
            generation += 1; api.token = token; player = user; game = nil; draft = ""; stats = nil; hintsShown = 0; nudgeReveals = []; sessionReady = false
            completedStreakRefreshState = .idle
            if let puzzleID = daily?.puzzle.id { synchronizeDailyThoughtPuzzle(for: puzzleID) }
            loadJourneyCache(for: user.id)
            journal = Journal(); journalWritable = false
            try loadJournal()
            purchases.retryPendingPurchaseAttribution()
            try await restore()
            if journalPlusEntitlementProvider() { await syncJournal() }
            await refreshStreakProgress()
            return true
        } catch { accountError = error.localizedDescription; return false }
    }
    func upgradeGuestAccount(username: String, email: String, password: String) async -> Bool {
        guard !busy, !submitting, let guest = player, guest.guest else { return false }
        busy = true; accountError = nil; defer { busy = false }
        do {
            let auth: AuthResponse = try await api.request(
                "/api/auth/guest/upgrade",
                method: "POST",
                body: [
                    "username": username.trimmingCharacters(in: .whitespacesAndNewlines),
                    "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
                    "password": password,
                ]
            )
            guard let token = auth.token, let user = auth.user, user.id == guest.id, !user.guest else {
                throw APIError(status: 0, message: "Your account was created, but Rebuzzle could not confirm the saved identity. Try again.")
            }

            // Keep the old guest token until the server confirms conversion and
            // the new bearer token is safely stored. The current puzzle and
            // identity-scoped journal remain attached to this same user ID.
            try credentials.write(token, key: "token")
            api.token = token
            player = user
            purchases.retryPendingPurchaseAttribution()
            try? credentials.write("member", key: "identity-kind")
            scheduleJourneyRefresh()
            if journalPlusEntitlementProvider() { await syncJournal() }
            return true
        } catch {
            accountError = error.localizedDescription
            return false
        }
    }
    func signOut() async {
        guard !busy, !submitting else { return }
        busy = true
        defer { busy = false }
        do {
            let _: SuccessResponse = try await api.request("/api/auth/logout", method: "POST")
            try clearIdentity()
        } catch { accountError = "Could not sign out. Check your connection and try again." }
    }
    func deleteAccount(password: String) async -> Bool {
        guard !busy, !submitting else { return false }
        busy = true; defer { busy = false }
        do {
            let _: SuccessResponse = try await api.request("/api/user/account", method: "DELETE", body: ["password": password], headers: ["X-Rebuzzle-Confirm": "delete-account"])
            if let id = player?.id { try storage.removeAccount(id) }
            try clearIdentity()
            return true
        } catch { accountError = error.localizedDescription; return false }
    }
    private func clearIdentity() throws {
        journalSyncTask?.cancel(); journalSyncTask = nil
        dailyThoughtExpiryTask?.cancel(); dailyThoughtExpiryTask = nil
        try credentials.write(nil, key: "token")
        eve.reset()
        generation += 1; api.token = nil; player = nil; game = nil; stats = nil
        completedStreakRefreshState = .idle
        journeyRefreshGeneration += 1; journeyIdentityID = nil; journeySnapshot = nil; journeySyncError = nil; journeySyncing = false
        draft = ""; dailyThought = ""; dailyThoughtAvailable = false; journal = Journal(); journalSyncCheckpoint = JournalSyncCheckpoint(); journalSyncStatus = .onDevice; journalHistoryComplete = true; journalWritable = false; hintsShown = 0; nudgeReveals = []; sessionReady = false; error = nil
    }
}
