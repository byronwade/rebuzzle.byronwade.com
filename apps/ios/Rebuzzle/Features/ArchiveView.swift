import SwiftUI
import RebuzzleCore

private struct ArchivePuzzleRoute: Hashable {
    let puzzleID: String
    let accountID: String?
    let isFreeSample: Bool
}

struct ArchiveView: View {
    @Environment(AppModel.self) private var model
    @State private var puzzles: [Puzzle] = []
    @State private var freeSample: Puzzle?
    @State private var nextCursor: String?
    @State private var loading = false
    @State private var sampleLoading = false
    @State private var loaded = false
    @State private var sampleLoaded = false
    @State private var error: String?
    @State private var sampleError: String?

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "THE REBUZZLE ARCHIVE")
                Text("Take another look.")
                    .font(Theme.display(36)).tracking(-1)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Past daily puzzles, ready for a fresh solve.")
                    .font(Theme.font(15)).foregroundStyle(Theme.secondary)
            }
            Label("Unscored practice", systemImage: "sparkles")
                .font(Theme.font(14, weight: .medium)).foregroundStyle(Theme.reward)
            Text("Replay a puzzle with three fresh guesses and progressive hints. Your daily result, streak, and rewards stay as they are.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)

            if !model.purchases.hasPlus {
                freeArchiveSection
            } else if loading && puzzles.isEmpty {
                ProgressView("Finding past puzzles…")
                    .frame(maxWidth: .infinity, minHeight: 140)
                    .accessibilityIdentifier("archiveLoading")
            } else if let error {
                VStack(alignment: .leading, spacing: 12) {
                    Notice(message: error)
                    Button("Try again") { Task { await load(reset: puzzles.isEmpty) } }
                        .buttonStyle(CommitStyle()).disabled(loading)
                }
            } else if puzzles.isEmpty && loaded {
                ContentUnavailableView("The archive is warming up", systemImage: "calendar", description: Text("There aren’t any earlier daily puzzles to replay yet."))
                    .accessibilityIdentifier("archiveEmpty")
            } else {
                LazyVStack(spacing: 10) {
                    ForEach(puzzles) { puzzle in
                        NavigationLink(value: ArchivePuzzleRoute(puzzleID: puzzle.id, accountID: model.player?.id, isFreeSample: false)) {
                            archiveRow(puzzle)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("archivePuzzle.\(puzzle.id)")
                    }
                    if nextCursor != nil {
                        Button {
                            Task { await load(reset: false) }
                        } label: {
                            HStack(spacing: 10) {
                                if loading { ProgressView().tint(Theme.canvas) }
                                Text(loading ? "Loading more puzzles…" : "Load more puzzles")
                            }
                        }
                        .buttonStyle(CommitStyle()).disabled(loading)
                        .accessibilityIdentifier("loadMoreArchive")
                    }
                }
            }
        }
        .navigationTitle("Puzzle archive")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: ArchivePuzzleRoute.self) { route in
            let puzzle = route.isFreeSample
                ? freeSample
                : puzzles.first(where: { $0.id == route.puzzleID })
            if model.player?.id == route.accountID,
               let puzzle, puzzle.id == route.puzzleID {
                PracticeGameView(
                    puzzle: puzzle,
                    api: model.api,
                    storage: model.storage,
                    accountID: route.accountID ?? "",
                    isFreeSample: route.isFreeSample
                )
            } else {
                ContentUnavailableView(
                    "Puzzle unavailable",
                    systemImage: "puzzlepiece",
                    description: Text("This puzzle isn't available for the current Rebuzzle account.")
                )
            }
        }
        .task {
            await model.purchases.refreshEntitlements()
            if model.purchases.hasPlus { await load(reset: true) }
            else { await loadFreeSample() }
        }
        .refreshable {
            await model.purchases.refreshEntitlements()
            if model.purchases.hasPlus { await load(reset: true) }
            else { await loadFreeSample() }
        }
    }

    @ViewBuilder private var freeArchiveSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("ONE FREE SAMPLE", systemImage: "sparkles")
                .font(Theme.font(12, weight: .semibold)).foregroundStyle(Theme.reward)
            Text("Take a fresh look at a past daily. Three guesses, progressive hints, and no effect on today’s score.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)

            if sampleLoading && freeSample == nil {
                ProgressView("Finding your sample puzzle…")
                    .frame(maxWidth: .infinity, minHeight: 100)
                    .accessibilityIdentifier("archiveSampleLoading")
            } else if let freeSample {
                NavigationLink(value: ArchivePuzzleRoute(
                    puzzleID: freeSample.id,
                    accountID: model.player?.id,
                    isFreeSample: true
                )) {
                    HStack(spacing: 14) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(freeSample.date ?? "Past daily")
                                .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                            Text(freeSample.typeName)
                                .font(Theme.font(20, weight: .medium)).foregroundStyle(Theme.ink)
                            Text("Difficulty \(freeSample.difficulty) of 10 · Play free")
                                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        }
                        Spacer(minLength: 4)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.accent)
                            .frame(width: 44, height: 44)
                            .background(Theme.accent.opacity(0.08), in: Circle())
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("archiveFreeSample")
                .accessibilityLabel("Free sample, \(freeSample.date ?? "past daily"), \(freeSample.typeName), difficulty \(freeSample.difficulty) of 10")
            } else if let sampleError {
                VStack(alignment: .leading, spacing: 10) {
                    Notice(message: sampleError)
                    Button("Try again") { Task { await loadFreeSample() } }
                        .buttonStyle(CommitStyle()).disabled(sampleLoading)
                }
            } else if sampleLoaded {
                ContentUnavailableView(
                    "No sample is ready yet",
                    systemImage: "calendar",
                    description: Text("Come back when another daily puzzle has been published.")
                ).accessibilityIdentifier("archiveSampleEmpty")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(Theme.reward.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))

        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: "sparkles")
                .font(.system(size: 24, weight: .regular)).foregroundStyle(Theme.reward)
            Text("The rest is yours with Plus")
                .font(Theme.font(20, weight: .medium))
            Text("Replay every past daily, keep a personal puzzle journal, and explore your solving patterns.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            NavigationLink(value: RebuzzleRoute.plus(source: .archive)) {
                Text("Explore Rebuzzle Plus").padding(.horizontal, 16).padding(.vertical, 8)
            }
            .buttonStyle(CommitStyle())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
        .accessibilityIdentifier("archivePlusUpsell")
    }

    private func archiveRow(_ puzzle: Puzzle) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Text(puzzle.date ?? "Past daily")
                    .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                Text(puzzle.typeName)
                    .font(Theme.font(18, weight: .medium)).foregroundStyle(Theme.ink)
                Text("Difficulty \(puzzle.difficulty) of 10 · Three fresh guesses")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            Spacer(minLength: 4)
            Image(systemName: "arrow.up.right")
                .font(.system(size: 15, weight: .medium)).foregroundStyle(Theme.accent)
                .frame(width: 44, height: 44)
                .background(Theme.accent.opacity(0.08), in: Circle())
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(puzzle.date ?? "Past daily"), \(puzzle.typeName), difficulty \(puzzle.difficulty) of 10. Unscored practice.")
    }

    @MainActor private func load(reset: Bool) async {
        guard !loading, model.purchases.hasPlus else { return }
        loading = true
        error = nil
        if reset {
            puzzles = []
            nextCursor = nil
        }
        defer { loading = false; loaded = true }
        do {
            let page = try await model.api.fetchArchive(cursor: reset ? nil : nextCursor)
            var seen = Set(puzzles.map(\.id))
            puzzles.append(contentsOf: page.items.filter { seen.insert($0.id).inserted })
            nextCursor = page.nextCursor
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor private func loadFreeSample() async {
        guard !sampleLoading, !model.purchases.hasPlus else { return }
        sampleLoading = true
        sampleError = nil
        defer { sampleLoading = false; sampleLoaded = true }
        do {
            freeSample = try await model.api.fetchArchiveSample()
        } catch {
            sampleError = error.localizedDescription
        }
    }
}
