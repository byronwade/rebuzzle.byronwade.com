import SwiftUI
import RebuzzleCore

struct PlusView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Text("Replay the puzzle. Keep the aha.")
                    .font(Theme.font(24, weight: .medium, relativeTo: .title2))
                    .tracking(-0.5)
                Text("Return to past dailies, write down what clicked, and see how your solving changes.")
                    .font(Theme.font(15)).foregroundStyle(Theme.secondary)
            }
            VStack(alignment: .leading, spacing: 24) {
                feature("calendar.badge.clock", "Replay past puzzles", "Try earlier daily puzzles with fresh guesses and feedback. Practice never changes your score, streak, or rewards.")
                feature("book.closed", "Keep a puzzle journal", "Revisit completed puzzles and save a note about what made the answer click.")
                feature("chart.bar.xaxis", "See how you solve", "Explore your guess distribution, solve rate, and hint-free wins.")
            }
            if let entry = model.journal.entries.first, !model.purchases.hasPlus {
                journalPreview(entry)
            }
            if model.purchases.hasPlus {
                NavigationLink {
                    ArchiveView()
                } label: {
                    Label("Browse past puzzles", systemImage: "calendar.badge.clock")
                        .padding(.horizontal, 16).padding(.vertical, 8)
                }
                .buttonStyle(CommitStyle())
                .accessibilityIdentifier("openPuzzleArchive")
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Your Plus access is tied to your Apple Account.").font(Theme.font(15, weight: .medium))
                Text("Your journal and notes are stored on this device. Export them before changing devices. Restoring Plus does not restore journal contents.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            HStack(spacing: 24) {
                Link("Privacy", destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!).frame(minHeight: 44)
                Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!).frame(minHeight: 44)
            }.font(Theme.font(13))
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            purchaseActionBar
        }
        .navigationTitle("Rebuzzle Plus")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .task {
            await model.purchases.load()
            if !model.purchases.hasPlus { model.recordGrowthEvent(.plusOfferViewed) }
        }
    }

    private func journalPreview(_ entry: JournalEntry) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("A page from your story", systemImage: "book.closed")
                    .font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.reward)
                Spacer(minLength: 0)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text(entry.puzzleDate).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                Text(entry.answer).font(Theme.font(26, weight: .semibold, relativeTo: .title))
                    .accessibilityIdentifier("plusPreviewAnswer")
                Text(entry.explanation).font(Theme.font(14)).foregroundStyle(Theme.secondary)
            }
            Label("Keep the thought that made it click.", systemImage: "pencil.line")
                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            Text("This is your completed puzzle. Plus lets you revisit your collection and add your own notes.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
            .padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
    }

    private var purchaseActionBar: some View {
        VStack(spacing: 8) {
            if model.purchases.hasPlus {
                Label("Rebuzzle Plus is yours", systemImage: "checkmark.seal.fill")
                    .font(Theme.font(16, weight: .medium)).foregroundStyle(Theme.success)
                NavigationLink { JournalView() } label: {
                    Label("Open your journal", systemImage: "book.closed")
                }
                .buttonStyle(CommitStyle())
                .accessibilityIdentifier("openPlusJournal")
            } else if let product = model.purchases.product {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Lifetime access").font(Theme.font(16, weight: .semibold))
                        Text("One-time payment. No subscription.")
                            .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                    }
                    Spacer(minLength: 8)
                    Text(product.displayPrice)
                        .font(Theme.font(25, weight: .medium, relativeTo: .title2))
                        .monospacedDigit()
                }
                Button { Task { await model.purchases.purchase() } } label: {
                    HStack(spacing: 12) {
                        Text("Unlock Rebuzzle Plus")
                        if model.purchases.busy { ProgressView().tint(Theme.canvas) }
                    }.padding(.horizontal, 16).padding(.vertical, 8)
                }
                .buttonStyle(CommitStyle())
                .disabled(model.purchases.busy)
                .accessibilityIdentifier("purchaseRebuzzlePlus")
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Lifetime access").font(Theme.font(16, weight: .semibold))
                        Text("One-time purchase. No subscription.")
                            .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                    }
                    Spacer(minLength: 8)
                    Text("—").font(Theme.font(25, weight: .medium, relativeTo: .title2))
                }
                Text("Connect to the App Store to see the price.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                Button { Task { await model.purchases.load() } } label: {
                    HStack(spacing: 12) {
                        Text("Check store availability")
                        if model.purchases.busy { ProgressView().tint(Theme.canvas) }
                    }.padding(.horizontal, 16).padding(.vertical, 8)
                }
                .buttonStyle(CommitStyle())
                .disabled(model.purchases.busy)
            }
            Text("Daily puzzles, hints, and sharing stay free.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            if let message = model.purchases.message { Notice(message: message) }
            Button("Restore purchases") { Task { await model.purchases.restore() } }
                .font(Theme.font(13)).frame(minHeight: 44).disabled(model.purchases.busy)
        }
        .padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 8)
        .background(Theme.canvas)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.secondary.opacity(0.18)).frame(height: 1)
        }
        .frame(maxWidth: 600).frame(maxWidth: .infinity)
    }

    private func feature(_ symbol: String, _ title: String, _ copy: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: symbol).font(.system(size: 20, weight: .regular))
                .frame(width: 24, height: 24).foregroundStyle(Theme.secondary)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(Theme.font(16, weight: .medium))
                Text(copy).font(Theme.font(14)).foregroundStyle(Theme.secondary)
            }
        }
    }
}
