import SwiftUI
import RebuzzleCore

struct PlusView: View {
    let source: PlusOfferSource
    @Environment(AppModel.self) private var model

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Text("Keep your aha moments.")
                    .font(Theme.font(24, weight: .medium, relativeTo: .title2))
                    .tracking(-0.5)
                Text("Turn daily discoveries into puzzles you can study, remember, and return to.")
                    .font(Theme.font(15)).foregroundStyle(Theme.secondary)
            }
            if !model.purchases.hasPlus {
                NavigationLink(value: RebuzzleRoute.archive) {
                    HStack(spacing: 14) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 20, weight: .medium)).foregroundStyle(Theme.reward)
                            .frame(width: 44, height: 44)
                            .background(Theme.reward.opacity(0.12), in: Circle())
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Try one archive puzzle free")
                                .font(Theme.font(16, weight: .medium)).foregroundStyle(Theme.ink)
                            Text("Three guesses. No score or streak impact.")
                                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        }
                        Spacer(minLength: 4)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.accent)
                    }
                    .padding(16)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("openFreeArchiveSample")
            }
            if let entry = model.journal.entries.first, !model.purchases.hasPlus {
                journalPreview(entry)
            }
            VStack(alignment: .leading, spacing: 24) {
                feature("calendar.badge.clock", "Past daily puzzles", "Replay earlier clues with fresh guesses, progressive hints, and answer-blind feedback. Practice never changes your score, streak, or rewards.")
                feature("book.closed", "A journal of discoveries", "Study completed puzzles again, reveal available hints one at a time, then see the answer.")
                feature("pencil.line", "A place for the aha", "Save a note about what made the answer click.")
                feature("chart.bar.xaxis", "Your solving patterns", "Explore guess distribution, solve rate, and hint-free wins.")
            }
            purchase
            if model.purchases.hasPlus {
                NavigationLink(value: RebuzzleRoute.archive) {
                    Label("Browse past puzzles", systemImage: "calendar.badge.clock")
                        .padding(.horizontal, 16).padding(.vertical, 8)
                }
                .buttonStyle(CommitStyle())
                .accessibilityIdentifier("openPuzzleArchive")
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Yours to keep. Yours to export.").font(Theme.font(15, weight: .medium))
                Text("Plus applies to your Apple Account. With Plus, your private journal notes sync with your signed-in Rebuzzle account and remain available on this device when you’re offline.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            HStack(spacing: 24) {
                Link("Privacy", destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!).frame(minHeight: 44)
                Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!).frame(minHeight: 44)
            }.font(Theme.font(13))
        }
        .navigationTitle("Rebuzzle Plus")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await model.purchases.load()
            await model.retryJournalSyncIfNeeded()
            if !model.purchases.hasPlus { model.recordGrowthEvent(.plusOfferViewed(source)) }
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
            .padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
    }

    private var purchase: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.purchases.hasPlus {
                Label("You have Rebuzzle Plus", systemImage: "checkmark.seal.fill")
                    .font(Theme.font(18, weight: .medium)).foregroundStyle(Theme.success)
                Text("Your journal and deeper insights are unlocked.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                NavigationLink(value: RebuzzleRoute.journal) {
                    Label("Open your journal", systemImage: "book.closed")
                }.buttonStyle(CommitStyle()).accessibilityIdentifier("openPlusJournal")
            } else if let product = model.purchases.product {
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.displayPrice).font(Theme.font(32, weight: .medium, relativeTo: .largeTitle)).monospacedDigit()
                    Text("One-time purchase. No subscription.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                }
                Button { Task { await model.purchases.purchase(source: source) } } label: {
                    HStack(spacing: 12) {
                        Text("Unlock Plus · \(product.displayPrice)")
                        if model.purchases.busy { ProgressView().tint(Theme.canvas) }
                    }.padding(.horizontal, 16).padding(.vertical, 8)
                }.buttonStyle(CommitStyle()).disabled(model.purchases.busy)
            } else {
                Text("One-time purchase. No subscription.").font(Theme.font(16, weight: .medium))
                Text("Connect to the App Store to see the price.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                Button { Task { await model.purchases.load() } } label: {
                    HStack(spacing: 12) {
                        Text("Check store availability")
                        if model.purchases.busy { ProgressView().tint(Theme.canvas) }
                    }.padding(.horizontal, 16).padding(.vertical, 8)
                }.buttonStyle(CommitStyle()).disabled(model.purchases.busy)
            }
            Text("Daily puzzles, hints, and sharing stay free.").font(Theme.font(13)).foregroundStyle(Theme.secondary)
            if let message = model.purchases.message { Notice(message: message) }
            Button("Restore purchases") { Task { await model.purchases.restore(); await model.retryJournalSyncIfNeeded() } }
                .font(Theme.font(14)).frame(minHeight: 44).disabled(model.purchases.busy)
        }
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
