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
    @AppStorage("appearance") private var appearance = "system"
    var body: some View {
        RootView().environment(model)
            .preferredColorScheme(appearance == "dark" ? .dark : appearance == "light" ? .light : nil)
            .tint(Theme.accent)
    }
}
enum AppTab: Hashable { case play, journey, you }

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var phase
    @State private var playPath: [RebuzzleRoute] = []
    private let returnRouter = ReturnRouter.shared

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            NavigationStack(path: $playPath) {
                ArcadeHomeView(
                    onPlayDaily: openDaily,
                    onOpenArchive: openArchive,
                    onOpenPlus: { openDestination(.plus) }
                )
                .navigationDestination(for: RebuzzleRoute.self) { route in
                    switch route {
                    case .daily: TodayView(onOpenMenu: openArcade)
                    case .archive: ArchiveView()
                    case .plus: PlusView()
                    case .journal: JournalView()
                    }
                }
            }
            .toolbar(playPath.isEmpty ? .hidden : .visible, for: .navigationBar)
            .id("play-" + (model.player?.id ?? "signed-out"))
            .tabItem { Label("Arcade", systemImage: "gamecontroller.fill") }
            .tag(AppTab.play)

            NavigationStack {
                ProgressViewScreen(onOpenMenu: openArcade, onOpenToday: openDaily)
            }
            .id("journey-" + (model.player?.id ?? "signed-out"))
            .tabItem { Label("Journey", systemImage: "chart.bar.fill") }
            .tag(AppTab.journey)

            NavigationStack { SettingsView(onOpenMenu: openArcade) }
                .id("you-" + (model.player?.id ?? "signed-out"))
                .tabItem { Label("You", systemImage: "person.crop.circle.fill") }
                .tag(AppTab.you)
        }
        .tint(Theme.accent)
        .toolbarBackground(Theme.panel, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .onOpenURL { returnRouter.open($0) }
        .task(id: returnRouter.request) {
            guard let request = returnRouter.request else { return }
            let source = returnRouter.entrySource
            model.saveDraft()
            openDaily()
            await model.load(entrySource: source)
            if returnRouter.request == request { returnRouter.request = nil }
        }
        .task { await model.reminders.refreshAuthorization(); await model.load(); await model.purchases.load() }
        .task(id: model.daily?.nextPuzzleTime) {
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
            if next == .active { Task { await model.reminders.refreshAuthorization(); await model.load(); await model.purchases.refreshEntitlements() } }
            if next == .background { model.saveDraft() }
        }
    }

    private func openArcade() {
        model.selectedTab = .play
        playPath = []
    }

    private func openDaily() {
        model.selectedTab = .play
        playPath = [.daily]
    }

    private func openDestination(_ destination: RebuzzleRoute) {
        model.selectedTab = .play
        playPath = [destination]
    }

    private func openArchive() {
        openDestination(model.purchases.hasPlus ? .archive : .plus)
    }
}
