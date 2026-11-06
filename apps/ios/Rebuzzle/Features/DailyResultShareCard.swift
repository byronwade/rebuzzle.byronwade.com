import CoreTransferable
import RebuzzleCore
import SwiftUI
import UniformTypeIdentifiers
import UIKit

struct DailyResultSharePayload: Transferable, Sendable {
    let imageData: Data
    let fallbackText: String

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .png) { $0.imageData }
        ProxyRepresentation(exporting: \.fallbackText)
    }
}

struct DailyResultShareArtifact {
    let summary: DailyShareSummary
    let payload: DailyResultSharePayload
    let previewImage: UIImage
    let previewTitle: String

    func matches(_ summary: DailyShareSummary) -> Bool { self.summary == summary }
}

@MainActor enum DailyResultShareCardRenderer {
    private static let size = CGSize(width: 360, height: 450)

    static func render(summary: DailyShareSummary) -> DailyResultShareArtifact? {
        guard summary.outcome != .inProgress else { return nil }
        let card = DailyResultShareCard(summary: summary)
            .frame(width: size.width, height: size.height)
            .environment(\.colorScheme, .light)
        let renderer = ImageRenderer(content: card)
        renderer.scale = 3
        renderer.proposedSize = ProposedViewSize(width: size.width, height: size.height)
        guard let image = renderer.uiImage, let data = image.pngData() else { return nil }
        let date = DailyResultShareCard.dateLabel(summary.puzzleDate)
        return DailyResultShareArtifact(
            summary: summary,
            payload: DailyResultSharePayload(imageData: data, fallbackText: summary.text),
            previewImage: image,
            previewTitle: "Rebuzzle · \(date)"
        )
    }
}

private struct DailyResultShareCard: View {
    let summary: DailyShareSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                IconTile(systemImage: "puzzlepiece.extension.fill", size: 30)
                Text("REBUZZLE")
                    .font(Theme.font(14, weight: .heavy))
                    .tracking(2.4)
                Spacer()
                Image(systemName: "sparkle")
                    .font(.system(size: 20, weight: .black))
                    .foregroundStyle(Theme.gold)
            }

            Spacer(minLength: 20)

            Text(Self.dateLabel(summary.puzzleDate).uppercased())
                .font(Theme.font(11, weight: .heavy))
                .tracking(1.4)
                .foregroundStyle(Theme.secondary)
            Text(resultTitle)
                .font(Theme.display(48))
                .tracking(-1.5)
                .foregroundStyle(summary.outcome == .solved ? Theme.reward : Theme.ink)
                .padding(.top, 7)
            Text(summary.headline)
                .font(Theme.font(16, weight: .bold))
                .foregroundStyle(Theme.secondary)
                .padding(.top, 5)

            GuessSlots(
                total: summary.maxAttempts,
                used: summary.attemptMarks.count,
                solved: summary.attemptMarks.last == true,
                size: 44
            )
            .padding(.top, 18)
            .accessibilityHidden(true)

            Pill(text: "\(summary.hintsUsed) \(summary.hintsUsed == 1 ? "hint" : "hints") used", systemImage: "lightbulb.fill", tint: Theme.eve)
                .padding(.top, 14)

            Spacer(minLength: 24)

            Rectangle()
                .fill(Theme.panelLedge)
                .frame(height: 2)
            Text("ONE PUZZLE. ONE CONNECTION.")
                .font(Theme.font(10, weight: .heavy))
                .tracking(1.1)
                .foregroundStyle(Theme.secondary)
                .padding(.top, 14)
            Text("Can you find today’s?")
                .font(Theme.display(19, relativeTo: .headline))
                .padding(.top, 4)
            Text("REBUZZLE.BYRONWADE.COM")
                .font(Theme.font(10, weight: .heavy))
                .tracking(0.8)
                .foregroundStyle(Theme.accent)
                .padding(.top, 7)
        }
        .padding(22)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .gameCard(padding: 0)
        .padding(.horizontal, 14)
        .padding(.top, 14)
        .padding(.bottom, 12)
        .frame(width: 360, height: 450)
        .background(Theme.canvas)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
    }

    private var accessibilitySummary: String {
        let result: String
        switch summary.outcome {
        case .inProgress: result = "Puzzle in progress"
        case .solved: result = "Solved"
        case .revealed: result = "Answer revealed"
        }
        return "Rebuzzle daily result, \(Self.dateLabel(summary.puzzleDate)), \(result), \(summary.headline), \(summary.hintsUsed) hints used. The card does not show guesses or the answer."
    }

    private var resultTitle: String {
        switch summary.outcome {
        case .inProgress: "Your move."
        case .solved: "Aha!"
        case .revealed: "The reveal."
        }
    }

    static func dateLabel(_ raw: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: raw) else { return raw }
        let formatter = DateFormatter()
        formatter.locale = .current
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "EEE · MMM d, yyyy"
        return formatter.string(from: date)
    }
}
