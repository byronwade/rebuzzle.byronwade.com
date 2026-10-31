import RebuzzleCore
import SwiftUI
import UIKit

struct DailyResultShareCard: View {
    let summary: DailyShareSummary

    private var solvedAt: Int {
        summary.attemptMarks.firstIndex(of: true).map { $0 + 1 } ?? summary.maximumAttempts
    }

    var body: some View {
        ZStack {
            Theme.canvas
            Circle()
                .fill(Theme.accent.opacity(0.08))
                .frame(width: 240, height: 240)
                .offset(x: 180, y: -210)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 9) {
                    Image(systemName: "puzzlepiece.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                    Text("REBUZZLE")
                        .font(Theme.font(12, weight: .semibold))
                        .tracking(1.5)
                    Spacer()
                    Text("DAILY")
                        .font(Theme.font(10, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(Theme.secondary)
                }

                Spacer(minLength: 30)

                Text(summary.puzzleDate.uppercased())
                    .font(Theme.font(11, weight: .medium))
                    .tracking(1.2)
                    .foregroundStyle(Theme.secondary)
                    .padding(.bottom, 13)

                Text(isSolved ? "You found\nthe connection." : "A proper\nhead-scratcher.")
                    .font(Theme.display(38))
                    .tracking(-1.1)
                    .lineSpacing(-1)
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)

                Text(outcomeDetail)
                    .font(Theme.font(14, weight: .medium))
                    .foregroundStyle(isSolved ? Theme.success : Theme.secondary)
                    .padding(.top, 12)

                Spacer(minLength: 26)

                HStack(spacing: 9) {
                    ForEach(Array(summary.attemptMarks.enumerated()), id: \.offset) { _, mark in
                        attemptTile(mark)
                    }
                    Spacer(minLength: 0)
                }

                HStack(spacing: 8) {
                    Image(systemName: "lightbulb")
                        .font(.system(size: 13, weight: .medium))
                    Text("\(summary.hintsUsed) hint\(summary.hintsUsed == 1 ? "" : "s") used")
                        .font(Theme.font(12, weight: .medium))
                }
                .foregroundStyle(Theme.secondary)
                .padding(.top, 16)

                Spacer(minLength: 28)

                Rectangle()
                    .fill(Theme.secondary.opacity(0.2))
                    .frame(height: 1)
                    .padding(.bottom, 15)

                Text("Can you find the connection?")
                    .font(Theme.font(14, weight: .medium))
                    .foregroundStyle(Theme.ink)
                Text(DailyShareSummary.shareURL)
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.secondary)
                    .padding(.top, 4)
            }
            .padding(28)
        }
        .frame(width: 360, height: 450)
        .clipped()
        .environment(\.colorScheme, .light)
    }

    private var outcomeDetail: String {
        switch summary.outcome {
        case .solved:
            "Solved in \(solvedAt) of \(summary.maximumAttempts)"
        case .solvedAfterScoreLock:
            "Solved after the scored round"
        case .revealed:
            "The answer was revealed"
        }
    }

    private var isSolved: Bool {
        summary.outcome == .solved || summary.outcome == .solvedAfterScoreLock
    }

    @ViewBuilder
    private func attemptTile(_ mark: Bool?) -> some View {
        let symbol = switch mark {
        case .some(true): "checkmark"
        case .some(false): "xmark"
        case .none: "circle"
        }
        let background = switch mark {
        case .some(true): Theme.success
        case .some(false): Theme.field
        case .none: Theme.panel
        }
        let foreground = mark == true ? Theme.panel : Theme.secondary

        Image(systemName: symbol)
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(foreground)
            .frame(width: 42, height: 42)
            .background(background, in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Theme.secondary.opacity(mark == nil ? 0.22 : 0), lineWidth: 1)
            }
    }
}

struct DailyResultShareRequest: Identifiable {
    let id = UUID()
    let summary: DailyShareSummary
    let pngData: Data?
}

struct DailyResultActivitySheet: UIViewControllerRepresentable {
    let pngData: Data?
    let shareText: String
    let onCompletion: (Bool) -> Void

    func makeUIViewController(context: Context) -> UIActivityViewController {
        var activityItems: [Any] = [shareText]
        if let pngData, let image = UIImage(data: pngData) {
            activityItems.insert(image, at: 0)
        }

        let controller = UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
        controller.completionWithItemsHandler = { _, completed, _, _ in
            onCompletion(completed)
        }
        return controller
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

@MainActor
enum DailyResultShareCardRenderer {
    static func matchingPNG(
        _ pngData: Data?,
        renderedFor renderedSummary: DailyShareSummary?,
        current summary: DailyShareSummary
    ) -> Data? {
        guard renderedSummary == summary else { return nil }
        return pngData
    }

    static func renderPNG(summary: DailyShareSummary) -> Data? {
        let renderer = ImageRenderer(content: DailyResultShareCard(summary: summary))
        renderer.proposedSize = ProposedViewSize(width: 360, height: 450)
        renderer.scale = 3
        renderer.isOpaque = true
        return renderer.uiImage?.pngData()
    }
}
