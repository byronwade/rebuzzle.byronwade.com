import SwiftUI
import RebuzzleCore

enum ArcadePalette {
    static let accent = Theme.accent
}

struct ArcadeHomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    let onPlayDaily: () -> Void
    let onOpenArchive: () -> Void
    let onOpenPlus: () -> Void

    var body: some View {
        Page(spacing: 20) {
            header
            dailyChallenge
            progressStrip
            archiveFeature
        }
        .accessibilityIdentifier("arcadeHome")
        .refreshable {
            await model.load()
            await model.refreshJourneyProgress()
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(Theme.accentLedge)
                    .frame(width: 46, height: 46)
                    .offset(y: 4)
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(Theme.accentFill)
                    .frame(width: 46, height: 46)
                Text("R")
                    .font(Theme.display(28, relativeTo: .title))
                    .foregroundStyle(.white)
                    .rotationEffect(.degrees(-6))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Rebuzzle")
                    .font(Theme.display(22, relativeTo: .title2))
                Text("PUZZLE ARCADE")
                    .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                    .tracking(1.3)
                    .foregroundStyle(Theme.secondary)
            }
            Spacer(minLength: 8)
            streakChip
        }
        .padding(.top, 2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Rebuzzle puzzle arcade. \(streakAccessibilityText)")
    }

    private var streakChip: some View {
        HStack(spacing: 6) {
            Image(systemName: "flame.fill")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.orange, Theme.gold)
            Text("\(model.stats?.streak ?? 0)")
                .font(Theme.display(20, relativeTo: .headline))
                .monospacedDigit()
            Text("DAY\nSTREAK")
                .font(Theme.font(8, weight: .bold, relativeTo: .caption2))
                .tracking(0.5)
                .lineSpacing(-1)
                .foregroundStyle(Theme.secondary)
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 44)
        .background(Capsule().fill(Theme.panel))
        .overlay(Capsule().strokeBorder(Theme.panelLedge, lineWidth: 2))
        .background(Capsule().fill(Theme.panelLedge).offset(y: 4))
        .accessibilityIdentifier("arcadeStreak")
    }

    private var streakAccessibilityText: String {
        let streak = model.stats?.streak ?? 0
        return "Current streak: \(streak) \(streak == 1 ? "day" : "days")"
    }

    private var dailyChallenge: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center) {
                HStack(spacing: 6) {
                    Image(systemName: "star.fill").font(.system(size: 11, weight: .black))
                    Text("DAILY CHALLENGE")
                        .font(Theme.font(12, weight: .heavy, relativeTo: .caption))
                        .tracking(0.9)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background(Capsule().fill(Theme.accentFill))
                .background(Capsule().fill(Theme.accentLedge).offset(y: 3))
                Spacer(minLength: 8)
                Text(dailyDateLabel.uppercased())
                    .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                    .tracking(0.6)
                    .foregroundStyle(Theme.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }

            Text(dailyTitle)
                .font(Theme.display(typeSize.isAccessibilitySize ? 28 : 34, relativeTo: .largeTitle))
                .tracking(-0.4)
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)

            dailyBoardPreview

            HStack(spacing: 8) {
                if let puzzle = model.daily?.puzzle {
                    Pill(text: puzzle.typeName.capitalized, systemImage: "puzzlepiece.fill", tint: Theme.accent)
                    Pill(text: "Difficulty \(puzzle.difficulty)/10", systemImage: "dial.medium.fill", tint: Theme.eve)
                } else {
                    Text(dailySubtitle).foregroundStyle(Theme.secondary)
                }
            }
            .font(Theme.font(10, weight: .bold, relativeTo: .caption))
            .tracking(0.55)
            .lineLimit(1)
            .minimumScaleFactor(0.78)

            guessTrack

            Button(action: beginDailyAction) {
                HStack(spacing: 11) {
                    Text(dailyButtonTitle)
                        .font(Theme.font(18, weight: .heavy, relativeTo: .headline))
                    Spacer(minLength: 4)
                    Image(systemName: model.game?.gameOver == true ? "arrow.uturn.backward" : "play.fill")
                        .font(.system(size: 13, weight: .heavy))
                        .accessibilityHidden(true)
                }
                .frame(minHeight: 34)
            }
            .buttonStyle(ChunkyButtonStyle(variant: model.game?.gameOver == true ? .success : .primary))
            .disabled(model.daily == nil && model.busy)
            .accessibilityIdentifier("playDailyPuzzle")
            .accessibilityHint(model.game?.gameOver == true ? "Review the completed daily round." : "Open today's puzzle board.")

            if model.daily == nil, let error = model.error, !model.busy {
                HStack(spacing: 12) {
                    Text(error).font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    Spacer(minLength: 4)
                    Button("Retry") { Task { await model.load() } }
                        .font(Theme.font(13, weight: .bold))
                        .foregroundStyle(ArcadePalette.accent)
                        .frame(minWidth: 52, minHeight: 44)
                }
                .accessibilityIdentifier("arcadeDailyLoadError")
            }

            if let reset = model.daily?.nextPuzzleTime {
                DailyPuzzleTicker(
                    resetAt: DailyReturnTiming.deadline(reset),
                    roundComplete: model.game?.gameOver == true
                )
                .padding(.horizontal, 12)
                .background(Theme.field, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
        .gameCard(padding: 18)
        // Keep the card a container so its Play button keeps its own identifier.
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("dailyChallengeCard")
    }

    private var dailyBoardPreview: some View {
        Group {
            if let puzzle = model.daily?.puzzle {
                PuzzleBoard(puzzle: puzzle, compactForReveal: true)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
            } else if model.busy {
                ProgressView("Preparing today's board")
                    .font(Theme.font(13, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                    .frame(maxWidth: .infinity, minHeight: 138)
            } else {
                Label("Today's board is unavailable", systemImage: "wifi.slash")
                    .font(Theme.font(13, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                    .frame(maxWidth: .infinity, minHeight: 138)
            }
        }
        .background(Theme.field, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
        .accessibilityIdentifier("arcadePuzzlePreview")
    }

    private var guessTrack: some View {
        let guesses = model.game?.attempts.count ?? 0
        let maxAttempts = model.game?.maxAttempts ?? 3
        return HStack(spacing: 10) {
            GuessSlots(total: maxAttempts, used: guesses, solved: model.game?.wasSuccessful == true, size: 26)
            Text(dailyProgressText)
                .font(Theme.font(13, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 4)
            if model.busy || !model.sessionReady {
                ProgressView().controlSize(.small).tint(ArcadePalette.accent)
            } else {
                Image(systemName: model.game?.gameOver == true ? "checkmark.circle.fill" : "bolt.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(model.game?.gameOver == true ? Theme.success : ArcadePalette.accent)
            }
        }
        .frame(minHeight: 32)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(dailyProgressText)
        .accessibilityIdentifier("dailyGuessTrack")
    }

    private var dailyTitle: String {
        guard model.daily != nil else { return model.busy ? "Preparing the board" : "Daily puzzle" }
        return model.game?.gameOver == true ? "Round complete" : "Daily puzzle"
    }

    private var dailySubtitle: String {
        if model.game?.gameOver == true {
            return model.game?.wasSuccessful == true ? "You found the connection." : "See what the clues were saying."
        }
        return model.daily == nil ? "A fresh clue is on its way." : "One board · three guesses"
    }

    private var dailyButtonTitle: String {
        if model.daily == nil && model.busy { return "Finding today's puzzle…" }
        if model.daily == nil { return "Try again" }
        if model.game?.gameOver == true { return "Review today's round" }
        return model.game?.attempts.isEmpty == false ? "Continue puzzle" : "Play today's puzzle"
    }

    private func beginDailyAction() {
        guard model.daily != nil else {
            Task { await model.load() }
            return
        }
        onPlayDaily()
    }

    private var dailyProgressText: String {
        guard let game = model.game else { return "3 guesses · hints when you need them" }
        if game.gameOver {
            return game.wasSuccessful == true ? "Solved in \(game.attempts.count) \(game.attempts.count == 1 ? "guess" : "guesses")" : "Round complete · review the answer"
        }
        let remaining = max(0, game.attemptsLeft)
        return "\(remaining) \(remaining == 1 ? "guess" : "guesses") left · hints available"
    }

    private var dailyDateLabel: String {
        guard let raw = model.daily?.puzzleDate else {
            return Date.now.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: raw) else { return raw }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }

    private var progressStrip: some View {
        Button { model.selectedTab = .journey } label: {
            HStack(spacing: 13) {
                IconTile(systemImage: "bolt.fill", face: Theme.eveFill, ledge: Theme.eveLedge, symbol: .white)
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        Text("JOURNEY")
                            .font(Theme.font(12, weight: .heavy, relativeTo: .caption))
                            .tracking(0.8)
                            .foregroundStyle(Theme.secondary)
                        if let summary = model.journeySnapshot?.summary {
                            Text("LEVEL \(summary.level)")
                                .font(Theme.font(9, weight: .bold, relativeTo: .caption2))
                                .tracking(0.4)
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    if let summary = model.journeySnapshot?.summary {
                        ChunkyProgressBar(value: Double(summary.xpIntoLevel) / 300, tint: Theme.successFill, height: 12)
                            .accessibilityElement()
                            .accessibilityLabel("Journey level progress")
                            .accessibilityValue("\(summary.xpIntoLevel) of 300 XP")
                        Text("\(summary.totalXP) XP earned · \(summary.finishes) rounds finished")
                            .font(Theme.font(11, weight: .medium))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    } else {
                        Text(model.journeySyncing ? "Syncing progress" : "Streaks, levels, and badges")
                            .font(Theme.font(14, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Theme.secondary)
            }
            .frame(maxWidth: .infinity, minHeight: 50)
            .gameCard(padding: 14)
            .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("arcadeJourneyPreview")
    }

    private var archiveFeature: some View {
        Button(action: model.purchases.hasPlus ? onOpenArchive : onOpenPlus) {
            HStack(alignment: .center, spacing: 13) {
                IconTile(systemImage: model.purchases.hasPlus ? "books.vertical.fill" : "crown.fill", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 7) {
                        Text(model.purchases.hasPlus ? "THE ARCHIVE" : "REBUZZLE PLUS")
                            .font(Theme.font(12, weight: .heavy, relativeTo: .caption))
                            .tracking(0.8)
                            .foregroundStyle(Theme.reward)
                        if model.purchases.hasPlus {
                            Text("UNLOCKED")
                                .font(Theme.font(8, weight: .bold, relativeTo: .caption2))
                                .tracking(0.4)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Theme.reward.opacity(0.12), in: Capsule())
                        }
                    }
                    Text(model.purchases.hasPlus ? "Replay past puzzles" : "Your puzzle collection")
                        .font(Theme.font(17, weight: .heavy))
                        .foregroundStyle(Theme.ink)
                    Text(model.purchases.hasPlus
                         ? "Past boards · fresh guesses · unscored"
                         : "Past puzzles · private journal · insights")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 4) {
                    if model.purchases.hasPlus {
                        Text("OPEN")
                            .font(Theme.font(9, weight: .bold, relativeTo: .caption))
                            .tracking(0.6)
                            .foregroundStyle(Theme.reward)
                    } else {
                        Text(model.purchases.product?.displayPrice ?? "SEE PRICE")
                            .font(Theme.font(13, weight: .bold, relativeTo: .subheadline))
                            .foregroundStyle(Theme.ink)
                            .monospacedDigit()
                        Text("ONE-TIME")
                            .font(Theme.font(8, weight: .bold, relativeTo: .caption2))
                            .tracking(0.45)
                            .foregroundStyle(Theme.secondary)
                    }
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.secondary)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 54, alignment: .leading)
            .gameCard(padding: 14)
            .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(archiveAccessibilityLabel)
        .accessibilityHint(model.purchases.hasPlus ? "Opens past puzzle replays." : "Opens the one-time Plus offer and its full feature list.")
        .accessibilityIdentifier("arcadeArchiveFeature")
    }

    private var archiveAccessibilityLabel: String {
        if model.purchases.hasPlus { return "Puzzle archive. Replay past puzzles. Plus unlocked." }
        let price = model.purchases.product?.displayPrice
        return "Rebuzzle Plus. Past puzzle replays, a private journal, and solving insights. One-time lifetime purchase. \(price ?? "Open to view price")."
    }
}
