import SwiftUI

@main struct RebuzzleApp: App {
    init() { NotificationDelegate.shared.install() }
    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
                // Hosted unit tests create their own models and StoreKit listeners.
                Color.clear
            } else {
                ApplicationView()
            }
            #else
            ApplicationView()
            #endif
        }
    }
}
private struct ApplicationView: View {
    @State private var model = AppModelFactory.make()
    @AppStorage("uiFixtureDailySolvePulseRequestCount") private var solvePulseRequestCount = 0
    var body: some View {
        RootView().environment(model)
            // Prestige is designed dark-first; there is no light variant.
            .preferredColorScheme(.dark)
            .tint(Theme.accent)
            #if DEBUG
            .overlay {
                if ProcessInfo.processInfo.arguments.contains("--ui-fixture") {
                    Text(String(solvePulseRequestCount))
                        .accessibilityIdentifier("fixtureDailySolvePulseRequestCount")
                        .accessibilityElement()
                        .frame(width: 1, height: 1)
                        .opacity(0.01)
                        .allowsHitTesting(false)
                }
            }
            #endif
    }
}
enum AppTab: Hashable { case play, journey, you }

enum RebuzzleRoute: Hashable {
    case journal
    case plus(source: PlusOfferSource)
    case reminder
    case help
    case signIn
    case guestUpgrade
    case deleteAccount
    case archive
    case journalEntry(entryID: String, accountID: String?)
    case challenges
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var phase
    @State private var playPath = NavigationPath()
    @State private var journeyPath = NavigationPath()
    @State private var youPath = NavigationPath()
    @State private var returnRouter = ReturnRouter.shared
    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            NavigationStack(path: $playPath) {
                TodayView()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
                .tabItem { Label("Play", systemImage: "puzzlepiece") }.tag(AppTab.play)
            NavigationStack(path: $journeyPath) {
                CareerScreen()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
                .tabItem { Label("Career", systemImage: "shield.lefthalf.filled") }.tag(AppTab.journey)
            NavigationStack(path: $youPath) {
                SettingsView()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
                .tabItem { Label("You", systemImage: "person.crop.circle") }.tag(AppTab.you)
        }
        .overlay {
            if let unlock = model.pendingUnlocks.first {
                ChallengeUnlockOverlay(unlock: unlock) { model.pendingUnlocks.removeFirst() }
                    .id(unlock.id)
            }
        }
        .onOpenURL { returnRouter.open($0) }
        .onChange(of: model.player?.id) {
            playPath = NavigationPath()
            journeyPath = NavigationPath()
            youPath = NavigationPath()
        }
        .onChange(of: returnRouter.request) { _, request in
            guard let request else { return }
            let source = returnRouter.entrySource
            model.saveDraft()
            model.selectedTab = .play
            playPath = NavigationPath()
            Task { @MainActor in
                await model.load(entrySource: source)
                if returnRouter.request == request { returnRouter.request = nil }
            }
        }
        .task {
            await model.reminders.refreshAuthorization()
            await model.load()
            await model.purchases.load()
            await model.retryJournalSyncIfNeeded()
        }
        .task(id: model.daily?.nextPuzzleTime) {
            guard !ProcessInfo.processInfo.arguments.contains("--ui-expired-reset-manual") else { return }
            guard let raw = model.daily?.nextPuzzleTime, let next = ResultView.date(raw) else { return }
            while !Task.isCancelled {
                let seconds = next.timeIntervalSinceNow + 1
                if seconds > 0 {
                    do { try await Task.sleep(for: .seconds(min(seconds, 86_400))) } catch { return }
                    continue
                }
                if model.busy || model.submitting {
                    do { try await Task.sleep(for: .seconds(1)) } catch { return }
                    continue
                }
                await model.load()
                guard model.daily?.nextPuzzleTime == raw else { return }
                // Keep trying after a transient failure or a server still publishing yesterday.
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
            }
        }
        .onChange(of: phase) { _, next in
            if next == .active {
                Task {
                    await model.reminders.refreshAuthorization()
                    await model.load()
                    await model.purchases.refreshEntitlements()
                    await model.retryJournalSyncIfNeeded()
                }
            }
            if next == .background { model.saveDraft() }
        }
    }

    @ViewBuilder
    private func destination(for route: RebuzzleRoute) -> some View {
        switch route {
        case .journal:
            JournalView()
        case let .plus(source):
            PlusView(source: source)
        case .reminder:
            ReminderView()
        case .help:
            HelpView()
        case .signIn:
            SignInView()
        case .guestUpgrade:
            GuestUpgradeView()
        case .deleteAccount:
            DeleteAccountView()
        case .archive:
            ArchiveView()
        case .challenges:
            ChallengesWall()
        case let .journalEntry(entryID, accountID):
            if model.player?.id == accountID,
               let entry = model.journal.entries.first(where: { $0.id == entryID }) {
                JournalDetail(entry: entry, accountID: accountID)
            } else {
                ContentUnavailableView(
                    "Journal entry unavailable",
                    systemImage: "book.closed",
                    description: Text("This entry isn't available for the current Rebuzzle account.")
                )
            }
        }
    }
}
