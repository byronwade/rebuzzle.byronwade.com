import SwiftUI

@main struct RebuzzleApp: App {
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
struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var phase
    var body: some View {
        TabView {
            NavigationStack { TodayView() }.id("today-" + (model.player?.id ?? "signed-out")).tabItem { Label("Today", systemImage: "square.grid.2x2") }
            NavigationStack { ProgressViewScreen() }.tabItem { Label("Progress", systemImage: "chart.bar.xaxis") }
            NavigationStack { JournalView() }.id(model.player?.id).tabItem { Label("Journal", systemImage: "book.closed") }
            NavigationStack { SettingsView() }.tabItem { Label("Settings", systemImage: "slider.horizontal.3") }
        }
        .task { await model.load(); await model.purchases.load() }
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
            if next == .active { Task { await model.load(); await model.purchases.refreshEntitlements() } }
            if next == .background { model.saveDraft() }
        }
    }
}
