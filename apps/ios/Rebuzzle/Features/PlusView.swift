import SwiftUI
import RebuzzleCore

struct PlusView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Page {
            hero
            VStack(alignment: .leading, spacing: 16) {
                feature("calendar.badge.clock", Theme.accentFill, Theme.accentLedge, "Replay past puzzles", "Try earlier daily puzzles with fresh guesses and feedback. Practice never changes your score, streak, or rewards.")
                feature("book.closed.fill", Theme.successFill, Theme.successLedge, "Keep a puzzle journal", "Revisit completed puzzles and save a note about what made the answer click.")
                feature("chart.bar.xaxis", Theme.errorFill, Theme.errorLedge, "See how you solve", "Explore your guess distribution, solve rate, and hint-free wins.")
            }
            .gameCard(padding: 18)
            if let entry = model.journal.entries.first, !model.purchases.hasPlus {
                journalPreview(entry)
            }
            if model.purchases.hasPlus {
                NavigationLink {
                    ArchiveView()
                } label: {
                    Label("Browse past puzzles", systemImage: "calendar.badge.clock")
                }
                .buttonStyle(ChunkyButtonStyle(variant: .primary))
                .accessibilityIdentifier("openPuzzleArchive")
            }
            HStack(alignment: .top, spacing: 13) {
                IconTile(systemImage: "apple.logo", face: Theme.panelLedge, ledge: Theme.secondary.opacity(0.45), symbol: Theme.ink, size: 38)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Your Plus access is tied to your Apple Account.").font(Theme.font(15, weight: .heavy))
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Your journal and notes are stored on this device. Export them before changing devices. Restoring Plus does not restore journal contents.")
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .gameCard(padding: 16)
            if typeSize.isAccessibilitySize {
                purchaseControls.gameCard(padding: 16)
            }
            HStack(spacing: 24) {
                Link("Privacy", destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!).frame(minHeight: 44)
                Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!).frame(minHeight: 44)
            }
            .font(Theme.font(14, weight: .heavy))
            .foregroundStyle(Theme.accent)
            .padding(.horizontal, 4)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            // At accessibility sizes the bar would cover most of the screen, so it scrolls inline instead.
            if !typeSize.isAccessibilitySize { purchaseActionBar }
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
                Pill(text: "A page from your story", systemImage: "book.closed.fill", tint: Theme.reward)
                Spacer(minLength: 0)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text(entry.puzzleDate).font(Theme.font(12, weight: .semibold)).foregroundStyle(Theme.secondary)
                Text(entry.answer).font(Theme.display(28, relativeTo: .title))
                    .accessibilityIdentifier("plusPreviewAnswer")
                Text(entry.explanation).font(Theme.font(14)).foregroundStyle(Theme.secondary)
            }
            Label("Keep the thought that made it click.", systemImage: "pencil.line")
                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            Text("This is your completed puzzle. Plus lets you revisit your collection and add your own notes.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
        }
            .gameCard(padding: 20)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                IconTile(systemImage: "crown.fill", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 54)
                Spacer(minLength: 8)
                if model.purchases.hasPlus {
                    Pill(text: "UNLOCKED", systemImage: "checkmark.seal.fill", tint: .white)
                } else {
                    Pill(text: "ONE-TIME", systemImage: "sparkles", tint: .white)
                }
            }
            Text("Replay the puzzle. Keep the aha.")
                .font(Theme.display(typeSize.isAccessibilitySize ? 28 : 30, relativeTo: .title))
                .tracking(-0.4)
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
            Text("Return to past dailies, write down what clicked, and see how your solving changes.")
                .font(Theme.font(15, weight: .medium))
                .foregroundStyle(.white.opacity(0.92))
                .fixedSize(horizontal: false, vertical: true)
        }
        .gameCard(tint: Theme.eveFill, ledge: Theme.eveLedge, padding: 20)
    }

    private var purchaseActionBar: some View {
        purchaseControls
            .padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 8)
            .frame(maxWidth: 600)
            .frame(maxWidth: .infinity)
            .background(Theme.panel)
            .overlay(alignment: .top) {
                Rectangle().fill(Theme.panelLedge).frame(height: 2)
            }
    }

    private var purchaseControls: some View {
        VStack(spacing: 10) {
            if model.purchases.hasPlus {
                Label("Rebuzzle Plus is yours", systemImage: "checkmark.seal.fill")
                    .font(Theme.font(16, weight: .heavy)).foregroundStyle(Theme.success)
                NavigationLink { JournalView() } label: {
                    Label("Open your journal", systemImage: "book.closed")
                }
                .buttonStyle(ChunkyButtonStyle(variant: .primary))
                .accessibilityIdentifier("openPlusJournal")
            } else if let product = model.purchases.product {
                priceRow(price: product.displayPrice, note: "One-time payment. No subscription.")
                Button { Task { await model.purchases.purchase() } } label: {
                    HStack(spacing: 12) {
                        Text("Unlock Rebuzzle Plus")
                        if model.purchases.busy { ProgressView().tint(Theme.onGold) }
                    }
                }
                .buttonStyle(ChunkyButtonStyle(variant: .reward))
                .disabled(model.purchases.busy)
                .accessibilityIdentifier("purchaseRebuzzlePlus")
            } else {
                priceRow(price: "—", note: "One-time purchase. No subscription.")
                Text("Connect to the App Store to see the price.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Button { Task { await model.purchases.load() } } label: {
                    HStack(spacing: 12) {
                        Text("Check store availability")
                        if model.purchases.busy { ProgressView().tint(Theme.onGold) }
                    }
                }
                .buttonStyle(ChunkyButtonStyle(variant: .reward))
                .disabled(model.purchases.busy)
            }
            Text("Daily puzzles, hints, and sharing stay free.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            if let message = model.purchases.message { Notice(message: message) }
            Button("Restore purchases") { Task { await model.purchases.restore() } }
                .buttonStyle(ChunkyButtonStyle(variant: .secondary, compact: true))
                .disabled(model.purchases.busy)
        }
    }

    private func priceRow(price: String, note: String) -> some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
            : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
        return layout {
            VStack(alignment: .leading, spacing: 3) {
                Text("Lifetime access").font(Theme.font(16, weight: .heavy))
                Text(note).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !typeSize.isAccessibilitySize { Spacer(minLength: 8) }
            Text(price)
                .font(Theme.display(26, relativeTo: .title2))
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func feature(_ symbol: String, _ face: Color, _ ledge: Color, _ title: String, _ copy: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            IconTile(systemImage: symbol, face: face, ledge: ledge, size: 44)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(Theme.font(16, weight: .heavy))
                    .fixedSize(horizontal: false, vertical: true)
                Text(copy).font(Theme.font(14)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
