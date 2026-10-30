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
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text("G\(guess.attemptNumber)")
                    .font(Theme.label(11)).tracking(1).foregroundStyle(guess.correct ? Theme.success : Theme.secondary)
                    .frame(width: 30, alignment: .leading)
                    .accessibilityLabel("Guess \(guess.attemptNumber)")
                Text(guess.guess).font(Theme.font(17, weight: .semibold)).textSelection(.enabled)
                    .strikethrough(!guess.correct, color: Theme.error.opacity(0.7))
                    .foregroundStyle(guess.correct ? Theme.success : Theme.ink)
                Spacer(minLength: 0)
                Image(systemName: guess.correct ? "checkmark" : "xmark")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(guess.correct ? Theme.success : Theme.error)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
            .background(Theme.field)
            .overlay(Rectangle().strokeBorder(Theme.hairline, lineWidth: 1))
            HStack(alignment: .top, spacing: 10) {
                EveAvatar(celebrating: guess.correct).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Eve · AI puzzle author")
                        .font(Theme.label(11)).tracking(1).textCase(.uppercase).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: 8) {
                        Text(title).font(Theme.display(21))
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
                                    .buttonStyle(.plain).foregroundStyle(Theme.gold)
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
                    }.frame(maxWidth: .infinity, alignment: .leading)
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
            VStack(alignment: .leading, spacing: 8) {
                Text("Eve · A nudge")
                    .font(Theme.label(11)).tracking(1).textCase(.uppercase).foregroundStyle(Theme.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "NUDGE \(number)")
                    Text(hint).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("eveNudge-\(number)")
                }
                .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.panel)
                .overlay(alignment: .leading) { Rectangle().fill(Theme.gold).frame(width: 2) }
            }
        }
        .accessibilityElement(children: .contain)
    }
}

struct EveAvatar: View {
    var celebrating = false
    var body: some View {
        Image(systemName: "face.smiling.inverse")
            .font(.system(size: 20, weight: .regular))
            .foregroundStyle(celebrating ? Theme.gold : Theme.ink)
            .frame(width: 30, height: 30)
            .overlay(Rectangle().strokeBorder(celebrating ? Theme.goldDeep : Theme.hairline, lineWidth: 1))
            .accessibilityLabel("Eve")
    }
}
