import SwiftUI

struct PlusView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: "Rebuzzle Plus")
                Text("More meaning.\nSame daily moment.").font(Theme.font(34, weight: .medium, relativeTo: .largeTitle)).tracking(-1)
                Text("For the ones who love the connection as much as the answer.").font(Theme.font(16)).foregroundStyle(Theme.secondary)
            }
            VStack(alignment: .leading, spacing: 24) {
                feature("book.closed", "Keep your discoveries", "A personal journal of every puzzle you complete here.")
                feature("pencil.line", "Remember your aha", "Write a note about the clue, the connection, or your day.")
                feature("chart.bar.xaxis", "Find your patterns", "See your guess distribution and how your daily practice grows.")
            }
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: "Journal preview · example")
                Text("A lightbulb moment").font(Theme.font(20, weight: .medium))
                Text("“I stopped reading the pictures separately. Suddenly it clicked.”").font(Theme.font(16)).foregroundStyle(Theme.secondary)
            }.padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 12) {
                if model.purchases.hasPlus {
                    Label("You have Rebuzzle Plus", systemImage: "checkmark.seal.fill").font(Theme.font(18, weight: .medium)).foregroundStyle(Theme.success)
                } else if let product = model.purchases.product {
                    Text("\(product.displayPrice) · One-time purchase").font(Theme.font(20, weight: .medium))
                    Text("No subscription. Daily puzzles, hints, and sharing stay free.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                    Button { Task { await model.purchases.purchase() } } label: {
                        HStack { Text("Unlock Plus · \(product.displayPrice)"); if model.purchases.busy { ProgressView().tint(Theme.canvas) } else { Image(systemName: "arrow.right") } }
                    }.buttonStyle(CommitStyle()).disabled(model.purchases.busy)
                } else {
                    Button("Check store availability") { Task { await model.purchases.load() } }.buttonStyle(CommitStyle())
                }
                if let message = model.purchases.message { Notice(message: message) }
                Button("Restore purchases") { Task { await model.purchases.restore() } }.font(Theme.font(14)).frame(minHeight: 44).disabled(model.purchases.busy)
            }
            Text("Plus applies to your Apple Account. Your journal starts with puzzles completed in this app and stays on this device. Export it anytime; purchase restoration does not restore journal data.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
            HStack(spacing: 24) { Link("Privacy", destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!); Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!) }.font(Theme.font(13))
        }.navigationTitle("Rebuzzle Plus").navigationBarTitleDisplayMode(.inline).task { await model.purchases.load() }
    }
    private func feature(_ symbol: String, _ title: String, _ copy: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: symbol).font(.system(size: 22, weight: .light)).frame(width: 28).foregroundStyle(Theme.secondary)
            VStack(alignment: .leading, spacing: 6) { Text(title).font(Theme.font(17, weight: .medium)); Text(copy).font(Theme.font(14)).foregroundStyle(Theme.secondary) }
        }
    }
}
