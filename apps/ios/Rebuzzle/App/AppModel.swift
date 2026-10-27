import Foundation
import Observation
import RebuzzleCore

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
    let eve: EveReplyStore
    let purchases = PurchaseStore()
    let reminders = ReminderStore()
    @ObservationIgnored let storage: LocalStore
    @ObservationIgnored let credentials: CredentialStore
    @ObservationIgnored private var started = Date()
    @ObservationIgnored private var initialSetupError: String?
    @ObservationIgnored private var generation = 0
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
        self.eve = EveReplyStore(storage: self.storage) { puzzleID, guess, update in
            try await client.streamQuip(puzzleID: puzzleID, guess: guess, onUpdate: update)
        }
        do { self.api.token = try secure.read("token") } catch { initialSetupError = error.localizedDescription }
    }
    func load() async {
        guard !busy, !submitting else { return }
        busy = true; error = nil
        defer { busy = false }
        if let initialSetupError { error = initialSetupError; return }
        do {
            let response: DailyResponse = try await api.request("/api/puzzle/today")
            if daily?.puzzle.id != response.puzzle.id {
                eve.reset()
                game = nil; sessionReady = false; draft = ""; hintsShown = 0; started = Date()
            }
            daily = response
            try? storage.save(response, key: "daily-cache")
            try await authenticate()
            if !journalWritable { try loadJournal() }
            try await restore()
            if let result: StatsResponse = try? await api.request("/api/user/stats") { stats = result.stats }
            try? await reminders.schedule(completedToday: completedCurrentPuzzle)
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
                    if player?.id != user.id { eve.reset(); game = nil; sessionReady = false; draft = "" }
                    player = user
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
            // A definitive expired guest session may be renewed using the stable device ID.
            api.token = nil
        }
        let response: AuthResponse = try await api.request("/api/auth/guest/lazy", method: "POST", body: [:])
        guard let user = response.user, let token = response.token else {
            throw APIError(status: 401, message: "Guest play could not start. Please try again later or sign in.")
        }
        try credentials.write(token, key: "token")
        try credentials.write(user.guest ? "guest" : "member", key: "identity-kind")
        if player?.id != user.id { eve.reset(); game = nil; sessionReady = false; draft = "" }
        api.token = token; player = user
        try loadJournal()
    }
    func restore() async throws {
        guard let daily, let player else { return }
        let encoded = daily.puzzle.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? daily.puzzle.id
        let restored: GameSession = try await api.request("/api/puzzle/session?puzzleId=\(encoded)")
        guard restored.puzzleId == daily.puzzle.id else { throw APIError(status: 0, message: "The puzzle changed. Reload today’s puzzle to continue.") }
        eve.activate(accountID: player.id, puzzleID: daily.puzzle.id)
        game = restored
        hintsShown = max(restored.hintsUsed, (try? storage.load(Int.self, key: "hints:\(player.id):\(daily.puzzle.id)")) ?? 0)
        draft = storage.draft(account: player.id, puzzle: daily.puzzle.id)
        needsReconciliation = false; sessionReady = true
        recordCompletion()
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
            let result: GuessResponse = try await api.request("/api/puzzles/guess", method: "POST", body: ["puzzleId": daily.puzzle.id, "guess": guess, "hintsUsed": hintsShown, "consecutiveCold": game?.attempts.reversed().prefix(while: { $0.reaction?.tier == "cold" }).count ?? 0, "timeSpentSeconds": max(0, Int(Date().timeIntervalSince(started)))])
            guard run == generation else { return }
            game?.apply(result, guess: guess)
            game?.hintsUsed = hintsShown
            eve.activate(accountID: player.id, puzzleID: daily.puzzle.id)
            if let confirmed = game?.attempts.last { eve.request(guess: confirmed) }
            draft = ""
            try storage.saveDraft("", account: player.id, puzzle: daily.puzzle.id)
            recordCompletion()
            if game?.gameOver == true {
                try? await reminders.schedule(completedToday: true)
                if let result: StatsResponse = try? await api.request("/api/user/stats") { stats = result.stats }
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
    func revealHint() {
        guard let daily, let player, sessionReady, game?.gameOver == false, hintsShown < daily.puzzle.hints.count else { return }
        hintsShown += 1
        do { try storage.save(hintsShown, key: "hints:\(player.id):\(daily.puzzle.id)") }
        catch { storageError = "Your hint progress could not be saved on this device." }
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
        journal.record(JournalEntry(puzzleID: daily.puzzle.id, puzzleDate: game.puzzleDate, puzzleType: daily.puzzle.puzzleType, clue: daily.puzzle.clue, answer: answer, explanation: game.explanation ?? "", won: game.wasSuccessful == true, attempts: game.attempts.count, hintsUsed: hintsShown, visual: daily.puzzle.visual))
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
            journal = Journal(); journalWritable = false
            try loadJournal()
            try await restore()
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
        draft = ""; journal = Journal(); journalWritable = false; hintsShown = 0; sessionReady = false; error = nil
    }
}
