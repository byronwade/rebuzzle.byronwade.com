import SwiftUI
import RebuzzleCore

@main struct RebuzzleApp: App {
    init() {
        NotificationDelegate.shared.install()
        // The "today's puzzle is waiting" dot uses the warm reward tone, not system red.
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        for item in [appearance.stackedLayoutAppearance, appearance.inlineLayoutAppearance, appearance.compactInlineLayoutAppearance] {
            item.normal.badgeBackgroundColor = UIColor(Theme.reward)
            item.selected.badgeBackgroundColor = UIColor(Theme.reward)
        }
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
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
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("uiFixtureDailySolvePulseRequestCount") private var solvePulseRequestCount = 0
    var body: some View {
        RootView().environment(model)
            .preferredColorScheme(appearance == "dark" ? .dark : appearance == "light" ? .light : nil)
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
    case achievements
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var phase
    @State private var playPath = NavigationPath()
    @State private var journeyPath = NavigationPath()
    @State private var youPath = NavigationPath()
    @State private var returnRouter = ReturnRouter.shared
    @AppStorage("haptics") private var haptics = true
    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            NavigationStack(path: $playPath) {
                TodayView()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
                .tint(Theme.accent)
                .tabItem { tabLabel("Play", symbol: "puzzlepiece", tab: .play) }.tag(AppTab.play)
                // An empty badge renders as a dot: today's puzzle is waiting.
                .badge(model.daily != nil && !model.completedCurrentPuzzle ? Text("") : nil)
            NavigationStack(path: $journeyPath) {
                ProgressViewScreen()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
                .tint(Theme.accent)
                .tabItem { tabLabel("Journey", symbol: "map", tab: .journey) }.tag(AppTab.journey)
            NavigationStack(path: $youPath) {
                SettingsView()
                    .navigationDestination(for: RebuzzleRoute.self) { destination(for: $0) }
            }
                .tint(Theme.accent)
                .tabItem { tabLabel("You", symbol: "person.crop.circle", tab: .you) }.tag(AppTab.you)
        }
        .tint(Theme.ink)
        .minimizingTabBarOnScroll()
        .sensoryFeedback(.selection, trigger: model.selectedTab) { _, _ in haptics }
        .overlay(alignment: .top) {
            if let unlock = model.pendingUnlocks.first {
                AchievementUnlockBanner(unlock: unlock) {
                    // The banner can dismiss by tap and by timeout; only remove the one it showed.
                    if model.pendingUnlocks.first?.id == unlock.id { model.pendingUnlocks.removeFirst() }
                }
                .id(unlock.id)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.25), value: model.pendingUnlocks.first?.id)
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
            #if DEBUG
            openPreviewScreen()
            #endif
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

    /// Outline when idle, filled when selected, so every tab reads at the same weight.
    private func tabLabel(_ title: String, symbol: String, tab: AppTab) -> some View {
        Label(title, systemImage: model.selectedTab == tab ? "\(symbol).fill" : symbol)
            .environment(\.symbolVariants, .none)
    }

    #if DEBUG
    /// `--preview-screen achievements|unlock` jumps straight to a screen for screenshots.
    private func openPreviewScreen() {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "--preview-screen"), index + 1 < args.count else { return }
        switch args[index + 1] {
        case "achievements":
            model.selectedTab = .journey
            journeyPath.append(RebuzzleRoute.achievements)
        case "unlock":
            model.pendingUnlocks = [ChallengeUnlock(lineID: "dailies", title: "Daily devotion", tier: 4, maxTier: 5, xp: 200, symbol: "calendar")]
        default:
            model.selectedTab = .journey
        }
    }
    #endif

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
        case .achievements:
            AchievementsView()
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

private extension View {
    @ViewBuilder func minimizingTabBarOnScroll() -> some View {
        if #available(iOS 26, *) {
            tabBarMinimizeBehavior(.onScrollDown)
        } else {
            self
        }
    }
}
