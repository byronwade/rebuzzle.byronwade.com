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
            VStack(alignment: .leading, spacing: 10) {
                Pill(text: "Unscored practice", systemImage: "sparkles", tint: Theme.reward)
                Text("Replay a puzzle with three fresh guesses and progressive hints. Your daily result, streak, and rewards stay as they are.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
            }

            if !model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 14) {
                    IconTile(systemImage: "lock.fill", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 50)
                    Text("A little more to explore")
                        .font(Theme.display(22, relativeTo: .title2))
                        .fixedSize(horizontal: false, vertical: true)
                    Text("The puzzle archive is part of Rebuzzle Plus. Unlock it from the Plus page to revisit past dailies.")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    NavigationLink { PlusView() } label: {
                        Text("Explore Rebuzzle Plus")
                    }.buttonStyle(ChunkyButtonStyle(variant: .reward))
                }
                    .gameCard(padding: 20)
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
                LazyVStack(spacing: 12) {
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
                                if loading { ProgressView().tint(Theme.ink) }
                                Text(loading ? "Loading more puzzles…" : "Load more puzzles")
                            }
                        }
                        .buttonStyle(ChunkyButtonStyle(variant: .secondary)).disabled(loading)
                        .padding(.top, 4)
                        .accessibilityIdentifier("loadMoreArchive")
                    }
                }
            }
        }
        .navigationTitle("Puzzle archive")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
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
        HStack(spacing: 13) {
            IconTile(systemImage: "puzzlepiece.fill", face: Theme.accentFill, ledge: Theme.accentLedge, size: 44)
            VStack(alignment: .leading, spacing: 6) {
                Text((puzzle.date ?? "Past daily").uppercased())
                    .font(Theme.font(11, weight: .heavy, relativeTo: .caption)).tracking(0.6)
                    .foregroundStyle(Theme.secondary)
                Text(puzzle.typeName.capitalized)
                    .font(Theme.font(17, weight: .heavy)).foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 6) { archivePills(puzzle) }
                    VStack(alignment: .leading, spacing: 6) { archivePills(puzzle) }
                }
            }
            Spacer(minLength: 4)
            Image(systemName: "play.fill")
                .font(.system(size: 14, weight: .heavy)).foregroundStyle(.white)
                .frame(width: 40, height: 40)
                .background(Circle().fill(Theme.successFill))
                .background(Circle().fill(Theme.successLedge).offset(y: 3))
                .padding(.bottom, 3)
                .accessibilityHidden(true)
        }
        .gameCard(padding: 14)
        .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(puzzle.date ?? "Past daily"), \(puzzle.typeName), difficulty \(puzzle.difficulty) of 10. Unscored practice.")
    }

    @ViewBuilder private func archivePills(_ puzzle: Puzzle) -> some View {
        Pill(text: "Difficulty \(puzzle.difficulty)/10", systemImage: "dial.medium.fill", tint: Theme.eve)
        Pill(text: "3 fresh guesses", systemImage: "sparkles", tint: Theme.success)
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
