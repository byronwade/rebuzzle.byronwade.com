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
                Image(systemName: "puzzlepiece.extension.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.accent)
                Text("REBUZZLE")
                    .font(Theme.font(13, weight: .bold))
                    .tracking(2.4)
                Spacer()
                Image(systemName: "sparkle")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(Theme.reward)
            }

            Spacer(minLength: 20)

            Text(Self.dateLabel(summary.puzzleDate).uppercased())
                .font(Theme.font(11, weight: .semibold))
                .tracking(1.4)
                .foregroundStyle(Theme.secondary)
            Text(resultTitle)
                .font(Theme.display(48))
                .tracking(-1.5)
                .foregroundStyle(summary.outcome == .solved ? Theme.reward : Theme.ink)
                .padding(.top, 7)
            Text(summary.headline)
                .font(Theme.font(16, weight: .medium))
                .foregroundStyle(Theme.secondary)
                .padding(.top, 5)

            HStack(spacing: 9) {
                ForEach(0..<summary.maxAttempts, id: \.self) { index in
                    let attempted = index < summary.attemptMarks.count
                    let solved = attempted && summary.attemptMarks[index]
                    RoundedRectangle(cornerRadius: 8)
                        .fill(solved ? Theme.accent : attempted ? Theme.field : Theme.canvas)
                        .overlay {
                            if !solved {
                                RoundedRectangle(cornerRadius: 8)
                                    .strokeBorder(Theme.secondary.opacity(attempted ? 0.25 : 0.38), lineWidth: 1)
                            }
                        }
                        .overlay {
                            if solved {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(.white)
                            } else if attempted {
                                Image(systemName: "minus")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(Theme.secondary)
                            }
                        }
                        .frame(width: 46, height: 46)
                }
            }
            .padding(.top, 20)
            .accessibilityHidden(true)

            Label("\(summary.hintsUsed) \(summary.hintsUsed == 1 ? "hint" : "hints") used", systemImage: "lightbulb")
                .font(Theme.font(12, weight: .medium))
                .foregroundStyle(Theme.secondary)
                .padding(.top, 12)

            Spacer(minLength: 24)

            Rectangle()
                .fill(Theme.secondary.opacity(0.2))
                .frame(height: 1)
            Text("ONE PUZZLE. ONE CONNECTION.")
                .font(Theme.font(10, weight: .semibold))
                .tracking(1.1)
                .foregroundStyle(Theme.secondary)
                .padding(.top, 18)
            Text("Can you find today’s?")
                .font(Theme.font(18, weight: .semibold))
                .padding(.top, 5)
            Text("REBUZZLE.BYRONWADE.COM")
                .font(Theme.font(10, weight: .medium))
                .tracking(0.8)
                .foregroundStyle(Theme.accent)
                .padding(.top, 7)
        }
        .padding(30)
        .frame(width: 360, height: 450)
        .background(Theme.canvas)
        .overlay {
            RoundedRectangle(cornerRadius: 4)
                .strokeBorder(Theme.ink.opacity(0.08), lineWidth: 1)
        }
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
