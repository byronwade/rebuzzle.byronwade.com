import SwiftUI
import UIKit
import RebuzzleCore

/// Conversation uses confirmed guesses and server feedback, never the hidden answer.
struct GuessTurnView: View {
    let guess: Guess
    let reply: String?
    let pending: Bool
    let failed: Bool
    let canRetry: Bool
    let latest: Bool
    let onRetry: () -> Void
    private var title: String {
        switch guess.reaction?.tier {
        case "correct": "Connection made"
        case "out": "The final reveal"
        case "close": "You’re close."
        case "warm": "A promising direction."
        case "cold": "Try another angle."
        default: "Keep looking."
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .trailing, spacing: 6) {
                Text("YOU · GUESS \(guess.attemptNumber)")
                    .font(Theme.font(10, weight: .semibold)).tracking(1).foregroundStyle(Theme.secondary)
                Text(guess.guess).font(Theme.font(17, weight: .medium)).textSelection(.enabled)
                    .padding(.horizontal, 16).padding(.vertical, 12)
                    .background(Theme.field, in: RoundedRectangle(cornerRadius: Theme.radius))
            }.frame(maxWidth: .infinity, alignment: .trailing).padding(.leading, 28)
            HStack(alignment: .top, spacing: 10) {
                EveAvatar(celebrating: guess.correct).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 10) {
                    Text("Eve · AI puzzle author")
                        .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: 10) {
                        Text(title).font(Theme.display(20))
                            .accessibilityIdentifier(latest ? "guessFeedback" : "guessFeedback-\(guess.id)")
                        if let reaction = guess.reaction {
                            Text(reaction.line).font(Theme.font(15)).foregroundStyle(Theme.secondary)
                        }
                        if let reply, !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Text(reply).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("eveReply-\(guess.id)")
                        }
                        if pending {
                            HStack(spacing: 8) {
                                ProgressView().controlSize(.mini)
                                Text("Eve is thinking…").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            }.accessibilityLabel("Eve is thinking")
                        } else if failed {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Eve couldn't reply just now. Your guess is saved.")
                                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .accessibilityIdentifier("eveReplyFailure-\(guess.id)")
                                if canRetry {
                                    Button(action: onRetry) {
                                        Label("Ask Eve again", systemImage: "arrow.clockwise")
                                            .font(Theme.font(13, weight: .semibold))
                                            .frame(minHeight: 44, alignment: .leading)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain).foregroundStyle(Theme.accent)
                                    .accessibilityLabel("Ask Eve to retry the reply for guess \(guess.attemptNumber)")
                                    .accessibilityIdentifier("retryEveReply-\(guess.id)")
                                }
                            }
                        }
                        if let words = guess.wordResults, words.count > 1,
                           words.contains(where: { $0.correct || ($0.similarity ?? 0) >= 70 }) {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), alignment: .leading)], alignment: .leading, spacing: 8) {
                                ForEach(Array(words.enumerated()), id: \.offset) { _, word in
                                    let near = !word.correct && (word.similarity ?? 0) >= 70
                                    Label(word.word, systemImage: word.correct ? "checkmark" : near ? "approximate" : "minus")
                                        .font(Theme.font(13, weight: .medium))
                                        .foregroundStyle(word.correct ? Theme.success : Theme.secondary)
                                        .padding(8).background(Theme.field, in: RoundedRectangle(cornerRadius: Theme.radius))
                                        .accessibilityLabel("\(word.word), \(word.correct ? "exact match" : near ? "near match" : "not matched")")
                                }
                            }
                            Text("✓ Exact match   ≈ Near match").font(Theme.font(11)).foregroundStyle(Theme.secondary)
                        }
                    }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.12), lineWidth: 1))
                }
            }
        }.accessibilityElement(children: .contain)
    }
}

struct EveNudgeTurnView: View {
    let number: Int
    let hint: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            EveAvatar().accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 10) {
                Text("Eve · A nudge")
                    .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "NUDGE \(number)")
                    Text(hint).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("eveNudge-\(number)")
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.12), lineWidth: 1))
            }
        }
        .accessibilityElement(children: .contain)
    }
}

struct EveAvatar: View {
    var celebrating = false
    var body: some View {
        Image(systemName: "face.smiling.inverse")
            .font(.system(size: 30, weight: .regular))
            .foregroundStyle(celebrating ? Theme.reward : Theme.accent)
            .frame(width: 38, height: 38)
            .background(celebrating ? Theme.reward.opacity(0.12) : Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: Theme.radius))
            .rotationEffect(.degrees(celebrating ? -8 : 0))
            .accessibilityLabel("Eve")
    }
}
