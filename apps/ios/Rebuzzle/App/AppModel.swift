import Foundation
import Observation
import RebuzzleCore
import WidgetKit

enum CompletedStreakRefreshState: Equatable {
    case idle
    case refreshing(puzzleID: String, celebrates: Bool)
    case fresh(puzzleID: String, celebrates: Bool)
    case failed(puzzleID: String)
}

struct JourneyBadgeCelebration: Equatable {
    let puzzleID: String
    let puzzleDate: String
    let badgeIDs: Set<String>
}

struct JourneyLevelCelebration: Equatable {
    let puzzleID: String
    let puzzleDate: String
    let level: Int
}

struct DailyHintReveal: Codable, Equatable, Identifiable {
    let hintIndex: Int
    let afterAttemptCount: Int

    var id: Int { hintIndex }
}

private struct DailyHintProgressRecord: Codable, Equatable {
    let revealedCount: Int
    let reveals: [DailyHintReveal]
}

private struct JourneyBadgeBaseline {
    let accountID: String
    let earnedBadgeIDs: Set<String>
    let level: Int
}

private struct PendingJourneyBadgeCheck {
    let accountID: String
    let puzzleID: String
    let puzzleDate: String
    let attempts: Int
    let solved: Bool
    let previouslyEarnedBadgeIDs: Set<String>
    let previouslyEarnedLevel: Int
}

@MainActor @Observable final class AppModel {
    var selectedTab: AppTab = .play
    var completedCurrentPuzzle: Bool {
        guard game?.gameOver == true, let raw = daily?.nextPuzzleTime,
              let expiry = DailyReturnTiming.deadline(raw) else { return false }
        return expiry > Date()
    }
    var daily: DailyResponse?
    var game: GameSession?
    var player: Player?
    var journal = Journal()
    var stats: PlayerStats?
    var completedStreakRefreshState: CompletedStreakRefreshState = .idle
    var journeySnapshot: JourneyProgressSnapshot?
    var journeyBadgeCelebration: JourneyBadgeCelebration?
    var journeyLevelCelebration: JourneyLevelCelebration?
    var journeySyncError: String?
    var journeySyncing = false
    var draft = ""
    var busy = false
    var submitting = false
    var error: String?
    var storageError: String?
    var accountError: String?
    var needsReconciliation = false
    var sessionReady = false
    private var journalWritable = false
    var hintsShown = 0
    var hintReveals: [DailyHintReveal] = []
    let eve: EveReplyStore
    let purchases = PurchaseStore()
    let reminders = ReminderStore()
    @ObservationIgnored let storage: LocalStore
    @ObservationIgnored let credentials: CredentialStore
    @ObservationIgnored private var started = Date()
    @ObservationIgnored private var initialSetupError: String?
    @ObservationIgnored private var generation = 0
    @ObservationIgnored private var journeyIdentityID: String?
    @ObservationIgnored private var journeyRefreshGeneration = 0
    @ObservationIgnored private var pendingJourneyBadgeCheck: PendingJourneyBadgeCheck?
    @ObservationIgnored private var pendingEntrySource: DailyEntrySource?
    @ObservationIgnored let api: APIClient

    init(api: APIClient? = nil, storage: LocalStore? = nil, credentials: CredentialStore = CredentialStore()) {
        self.storage = storage ?? LocalStore()
        self.credentials = credentials
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
                eve.reset()
                game = nil; sessionReady = false; draft = ""; hintsShown = 0; hintReveals = []; started = Date()
                completedStreakRefreshState = .idle
            }
            daily = response
            if DailyResetSnapshotStore.save(nextPuzzleTime: response.nextPuzzleTime) {
                WidgetCenter.shared.reloadTimelines(ofKind: "RebuzzleDaily")
            }
            try? storage.save(response, key: "daily-cache")
            try await authenticate()
            if !journalWritable { try loadJournal() }
            try await restore()
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
                        eve.reset(); game = nil; sessionReady = false; draft = ""; stats = nil; hintsShown = 0; hintReveals = []
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
            eve.reset(); game = nil; sessionReady = false; draft = ""; stats = nil; hintsShown = 0; hintReveals = []
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
        restoreHintProgress(for: player.id, puzzleID: daily.puzzle.id, serverCount: restored.hintsUsed, attemptCount: restored.attempts.count, availableCount: daily.puzzle.hints.count)
        draft = storage.draft(account: player.id, puzzle: daily.puzzle.id)
        needsReconciliation = false; sessionReady = true
        recordCompletion()
        await DailyLiveActivityStore.shared.reconcile(daily: daily, game: restored)
        scheduleJourneyRefresh()
    }
    private func restoreHintProgress(for accountID: String, puzzleID: String, serverCount: Int, attemptCount: Int, availableCount: Int) {
        let progressKey = "hint-progress:\(accountID):\(puzzleID)"
        let legacyKey = "hints:\(accountID):\(puzzleID)"
        let saved = try? storage.load(DailyHintProgressRecord.self, key: progressKey)
        let legacyCount = (try? storage.load(Int.self, key: legacyKey)) ?? 0
        let describedCount = (saved?.reveals.compactMap { $0.hintIndex }.max().map { $0 + 1 }) ?? 0
        let requestedCount = max(serverCount, legacyCount, saved?.revealedCount ?? 0, describedCount)
        let count = min(max(0, requestedCount), max(0, availableCount))
        let clampedAttempts = max(0, attemptCount)

        var positions: [Int: DailyHintReveal] = [:]
        for reveal in saved?.reveals ?? [] where (0..<count).contains(reveal.hintIndex) {
            guard positions[reveal.hintIndex] == nil else { continue }
            positions[reveal.hintIndex] = DailyHintReveal(
                hintIndex: reveal.hintIndex,
                afterAttemptCount: min(max(0, reveal.afterAttemptCount), clampedAttempts)
            )
        }
        let normalizedReveals = (0..<count).map { index in
            positions[index] ?? DailyHintReveal(hintIndex: index, afterAttemptCount: clampedAttempts)
        }

        hintsShown = count
        hintReveals = normalizedReveals
        let normalized = DailyHintProgressRecord(revealedCount: count, reveals: normalizedReveals)
        if saved != normalized || legacyCount != count {
            persistHintProgress(normalized, legacyKey: legacyKey, progressKey: progressKey)
        }
    }
    private func persistHintProgress(_ progress: DailyHintProgressRecord, legacyKey: String, progressKey: String) {
        do {
            try storage.save(progress, key: progressKey)
            try storage.save(progress.revealedCount, key: legacyKey)
        } catch {
            storageError = "Your hint progress could not be saved on this device."
        }
    }
    private func loadJourneyCache(for userID: String) {
        guard journeyIdentityID != userID else { return }
        journeyRefreshGeneration += 1
        journeyIdentityID = userID
        journeyBadgeCelebration = nil
        journeyLevelCelebration = nil
        pendingJourneyBadgeCheck = nil
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
    @discardableResult
    func refreshJourneyProgress() async -> Bool {
        guard let userID = player?.id else { return false }
        journeyRefreshGeneration += 1
        let requestGeneration = journeyRefreshGeneration
        journeySyncing = true
        do {
            let snapshot = try await api.fetchJourneyProgress()
            try? storage.save(snapshot, key: "journey:\(userID)")
            guard requestGeneration == journeyRefreshGeneration, player?.id == userID else { return false }
            if let pending = pendingJourneyBadgeCheck,
               pending.accountID == userID,
               snapshot.backfill.status == .complete {
                if let summary = snapshot.summary {
                    let confirmsCompletion = snapshot.recentEntries.contains { entry in
                        entry.puzzleId == pending.puzzleID
                            && entry.puzzleDate == pending.puzzleDate
                            && entry.attempts == pending.attempts
                            && entry.outcome == (pending.solved ? .solved : .failed)
                    }
                    let newBadgeIDs = Set(summary.badges).subtracting(pending.previouslyEarnedBadgeIDs)
                    journeyBadgeCelebration = confirmsCompletion && !newBadgeIDs.isEmpty
                        ? JourneyBadgeCelebration(
                            puzzleID: pending.puzzleID,
                            puzzleDate: pending.puzzleDate,
                            badgeIDs: newBadgeIDs
                        )
                        : nil
                    journeyLevelCelebration = confirmsCompletion && summary.level > pending.previouslyEarnedLevel
                        ? JourneyLevelCelebration(
                            puzzleID: pending.puzzleID,
                            puzzleDate: pending.puzzleDate,
                            level: summary.level
                        )
                        : nil
                } else {
                    journeyBadgeCelebration = nil
                    journeyLevelCelebration = nil
                }
                pendingJourneyBadgeCheck = nil
            }
            journeySnapshot = snapshot
            journeySyncError = nil
            journeySyncing = false
            return true
        } catch {
            guard requestGeneration == journeyRefreshGeneration, player?.id == userID else { return false }
            if pendingJourneyBadgeCheck?.accountID == userID {
                pendingJourneyBadgeCheck = nil
                journeyBadgeCelebration = nil
                journeyLevelCelebration = nil
            }
            journeySyncError = error.localizedDescription
            journeySyncing = false
            return false
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
            let hasFreshProgress = await refreshJourneyProgress()
            guard run == generation else { return }
            let badgeBaseline: JourneyBadgeBaseline? = {
                guard hasFreshProgress,
                      journeyIdentityID == player.id,
                      let snapshot = journeySnapshot,
                      snapshot.backfill.status == .complete,
                      let summary = snapshot.summary else { return nil }
                return JourneyBadgeBaseline(accountID: player.id, earnedBadgeIDs: Set(summary.badges), level: summary.level)
            }()
            let result: GuessResponse = try await api.request("/api/puzzles/guess", method: "POST", body: ["puzzleId": daily.puzzle.id, "guess": guess, "hintsUsed": hintsShown, "consecutiveCold": game?.attempts.reversed().prefix(while: { $0.reaction?.tier == "cold" }).count ?? 0, "timeSpentSeconds": max(0, Int(Date().timeIntervalSince(started)))])
            guard run == generation else { return }
            if result.gameOver {
                completedStreakRefreshState = .refreshing(puzzleID: daily.puzzle.id, celebrates: true)
            }
            game?.apply(result, guess: guess)
            if result.gameOver && game?.wasSuccessful == true {
                GameSoundPlayer.shared.play(.solve)
            } else if !result.gameOver,
                      let tier = game?.attempts.last?.reaction?.tier.lowercased(),
                      ["close", "warm"].contains(tier) {
                GameSoundPlayer.shared.play(.closeGuess)
            }
            game?.hintsUsed = hintsShown
            eve.activate(accountID: player.id, puzzleID: daily.puzzle.id)
            if let confirmed = game?.attempts.last { eve.request(guess: confirmed) }
            draft = ""
            try storage.saveDraft("", account: player.id, puzzle: daily.puzzle.id)
            recordCompletion()
            await DailyLiveActivityStore.shared.reconcile(daily: daily, game: game)
            if game?.gameOver == true {
                journeyBadgeCelebration = nil
                journeyLevelCelebration = nil
                if let badgeBaseline {
                    pendingJourneyBadgeCheck = PendingJourneyBadgeCheck(
                        accountID: badgeBaseline.accountID,
                        puzzleID: daily.puzzle.id,
                        puzzleDate: daily.puzzleDate,
                        attempts: game?.attempts.count ?? 0,
                        solved: game?.wasSuccessful == true,
                        previouslyEarnedBadgeIDs: badgeBaseline.earnedBadgeIDs,
                        previouslyEarnedLevel: badgeBaseline.level
                    )
                } else {
                    pendingJourneyBadgeCheck = nil
                }
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
    func reconcile() async {
        guard !busy, !submitting else { return }
        busy = true; defer { busy = false }
        do { try await restore(); error = nil }
        catch { self.error = error.localizedDescription }
    }
    func setLiveRoundEnabled(_ enabled: Bool) async -> Bool {
        await DailyLiveActivityStore.shared.setEnabled(enabled, daily: daily, game: game)
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
        guard !busy, !submitting, !needsReconciliation,
              let daily, let player, sessionReady, game?.gameOver == false,
              hintsShown < daily.puzzle.hints.count else { return }
        let reveal = DailyHintReveal(hintIndex: hintsShown, afterAttemptCount: game?.attempts.count ?? 0)
        hintsShown += 1
        hintReveals.append(reveal)
        let progress = DailyHintProgressRecord(revealedCount: hintsShown, reveals: hintReveals)
        persistHintProgress(progress, legacyKey: "hints:\(player.id):\(daily.puzzle.id)", progressKey: "hint-progress:\(player.id):\(daily.puzzle.id)")
        GameSoundPlayer.shared.play(.hint)
    }
    func saveDraft() {
        guard let player, let daily else { return }
        do { try storage.saveDraft(draft, account: player.id, puzzle: daily.puzzle.id) }
        catch { storageError = "Your draft could not be saved on this device." }
    }
    private func loadJournal() throws {
        journalWritable = false
        journal = Journal()
        guard let player else { return }
        journal = try storage.load(Journal.self, key: "journal:\(player.id)") ?? Journal()
        journalWritable = true
    }
    func saveJournal() {
        guard let player, journalWritable else { return }
        do { try storage.save(journal, key: "journal:\(player.id)"); storageError = nil }
        catch { storageError = "Your journal could not be saved. Export a copy before leaving." }
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
            eve.reset()
            generation += 1; api.token = token; player = user; game = nil; draft = ""; stats = nil; sessionReady = false
            completedStreakRefreshState = .idle
            loadJourneyCache(for: user.id)
            journal = Journal(); journalWritable = false
            try loadJournal()
            try await restore()
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
            try? credentials.write("member", key: "identity-kind")
            scheduleJourneyRefresh()
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
        try credentials.write(nil, key: "token")
        eve.reset()
        generation += 1; api.token = nil; player = nil; game = nil; stats = nil
        completedStreakRefreshState = .idle
        journeyRefreshGeneration += 1; journeyIdentityID = nil; journeySnapshot = nil; journeySyncError = nil; journeySyncing = false
        journeyBadgeCelebration = nil; journeyLevelCelebration = nil; pendingJourneyBadgeCheck = nil
        draft = ""; journal = Journal(); journalWritable = false; hintsShown = 0; hintReveals = []; sessionReady = false; error = nil
    }
}
