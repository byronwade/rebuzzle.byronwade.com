import SwiftUI

struct PlusView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Text("Make each connection yours.")
                    .font(Theme.font(24, weight: .medium, relativeTo: .title2))
                    .tracking(-0.5)
                Text("Your puzzle journal, personal notes, and a closer look at how you solve.")
                    .font(Theme.font(15)).foregroundStyle(Theme.secondary)
            }
            purchase
            VStack(alignment: .leading, spacing: 24) {
                feature("book.closed", "A journal of discoveries", "Revisit the puzzles you complete in this app.")
                feature("pencil.line", "A place for the aha", "Save a note about what made the answer click.")
                feature("chart.bar.xaxis", "Your solving patterns", "Explore guess distribution, solve rate, and hint-free wins.")
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Yours to keep. Yours to export.").font(Theme.font(15, weight: .medium))
                Text("Plus applies to your Apple Account. Your journal stays on this device for this Rebuzzle account. Export a copy before changing devices. Restoring Plus restores the purchase, not your journal data.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            HStack(spacing: 24) {
                Link("Privacy", destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!).frame(minHeight: 44)
                Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!).frame(minHeight: 44)
            }.font(Theme.font(13))
        }
        .navigationTitle("Rebuzzle Plus")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.purchases.load() }
    }

    private var purchase: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.purchases.hasPlus {
                Label("You have Rebuzzle Plus", systemImage: "checkmark.seal.fill")
                    .font(Theme.font(18, weight: .medium)).foregroundStyle(Theme.success)
                Text("Your journal and deeper insights are unlocked.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            } else if let product = model.purchases.product {
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.displayPrice).font(Theme.font(32, weight: .medium, relativeTo: .largeTitle)).monospacedDigit()
                    Text("One-time purchase. No subscription.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                }
                Button { Task { await model.purchases.purchase() } } label: {
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
            Button("Restore purchases") { Task { await model.purchases.restore() } }
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
