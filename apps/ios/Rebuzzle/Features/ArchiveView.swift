import SwiftUI
import RebuzzleCore

struct ArchiveView: View {
    @Environment(AppModel.self) private var model
    @State private var puzzles: [Puzzle] = []
    @State private var nextCursor: String?
    @State private var loading = false
    @State private var loaded = false
    @State private var error: String?

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
                VStack(alignment: .leading, spacing: 14) {
                    Image(systemName: "lock.open")
                        .font(.system(size: 28, weight: .light)).foregroundStyle(Theme.reward)
                    Text("A little more to explore")
                        .font(Theme.font(20, weight: .medium))
                    Text("The puzzle archive is part of Rebuzzle Plus. Unlock it from the Plus page to revisit past dailies.")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                    NavigationLink { PlusView() } label: {
                        Text("Explore Rebuzzle Plus").padding(.horizontal, 16).padding(.vertical, 8)
                    }.buttonStyle(CommitStyle())
                }.frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
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
                        NavigationLink {
                            PracticeGameView(puzzle: puzzle, api: model.api, storage: model.storage, accountID: model.player?.id ?? "")
                        } label: {
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
        .task {
            await model.purchases.refreshEntitlements()
            guard model.purchases.hasPlus else { return }
            await load(reset: true)
        }
        .refreshable {
            await model.purchases.refreshEntitlements()
            guard model.purchases.hasPlus else { return }
            await load(reset: true)
        }
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
}
