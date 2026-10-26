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
    @State private var playNavigation = UUID()
    private let returnRouter = ReturnRouter.shared
    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            NavigationStack { TodayView() }
                .id("play-" + (model.player?.id ?? "signed-out") + playNavigation.uuidString)
                .tabItem { Label("Play", systemImage: "puzzlepiece") }.tag(AppTab.play)
            NavigationStack { ProgressViewScreen() }
                .id("journey-" + (model.player?.id ?? "signed-out"))
                .tabItem { Label("Journey", systemImage: "map") }.tag(AppTab.journey)
            NavigationStack { SettingsView() }
                .id("you-" + (model.player?.id ?? "signed-out"))
                .tabItem { Label("You", systemImage: "person.crop.circle") }.tag(AppTab.you)
        }
        .onOpenURL { returnRouter.open($0) }
        .task(id: returnRouter.request) {
            guard let request = returnRouter.request else { return }
            model.saveDraft()
            model.selectedTab = .play
            playNavigation = UUID()
            await model.load()
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
}
