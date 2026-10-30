import SwiftUI
import RebuzzleCore

/// Expanded rank card that leads the Career tab.
struct JourneyLevelView: View {
    let progress: JourneyProgress
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        let rank = PrestigeRank(level: progress.level)
        VStack(alignment: .leading, spacing: 18) {
            let layout = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 14))
                : AnyLayout(HStackLayout(alignment: .center, spacing: 18))
            layout {
                RankEmblem(rank: rank, size: typeSize.isAccessibilitySize ? 60 : 80)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Level \(progress.level)").font(Theme.label(12)).tracking(1.4).textCase(.uppercase)
                        .foregroundStyle(Theme.gold)
                        .accessibilityIdentifier("journeyLevel")
                    Text(rank.title.uppercased()).font(Theme.display(typeSize.isAccessibilitySize ? 30 : 38))
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel("Rank \(rank.name) \(rank.subTierNumber)")
                }
            }
            ProgressRail(fraction: Double(progress.levelXP) / 300, height: 5)
                .accessibilityHidden(false)
                .accessibilityLabel("Level progress")
                .accessibilityValue("\(progress.levelXP) of 300 XP")
            ViewThatFits(in: .horizontal) {
                HStack {
                    xpLabel
                    Spacer(minLength: 12)
                    nextLevelLabel
                }
                VStack(alignment: .leading, spacing: 6) { xpLabel; nextLevelLabel }
            }
        }
        .prestigePanel(padding: 20)
    }
    private var xpLabel: some View {
        Text("\(progress.totalXP.formatted()) XP earned").font(Theme.label(13)).tracking(1).monospacedDigit()
            .foregroundStyle(Theme.ink)
            .accessibilityIdentifier("journeyXP")
    }
    private var nextLevelLabel: some View {
        Text("\(300 - progress.levelXP) to level \(progress.level + 1)")
            .font(Theme.font(12)).foregroundStyle(Theme.secondary)
    }
}

struct JourneyRewards: View {
    let game: GameSession
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    private var points: Int { JourneyProgress.points(won: game.wasSuccessful == true, attempts: game.attempts.count, hintsUsed: model.hintsShown) }
    private var stars: Int { game.wasSuccessful == true ? max(1, 4 - game.attempts.count) : 0 }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    ForEach(0..<3) { index in
                        Image(systemName: index < stars ? "star.fill" : "star")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(index < stars ? Theme.reward : Theme.muted)
                            .scaleEffect(index < stars && !appeared && !reduceMotion ? 0.6 : 1)
                            .rotationEffect(.degrees(index < stars && !appeared && !reduceMotion ? -14 : 0))
                            .animation(
                                reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.56).delay(Double(index) * 0.12),
                                value: appeared
                            )
                    }
                }.accessibilityLabel("\(stars) of 3 stars")
                Spacer()
                Text("+\(points) XP").font(Theme.display(26)).monospacedDigit()
                    .foregroundStyle(Theme.reward).accessibilityIdentifier("earnedXP")
            }
            Text(game.wasSuccessful == true ? (stars == 3 ? "First guess. Nailed it." : "That’s your daily aha.") : "A new connection, even on the tricky days.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            Button { model.selectedTab = .journey } label: {
                HStack { Text("See your career"); Spacer(); Image(systemName: "arrow.right") }
                    .font(Theme.label(13)).tracking(1).textCase(.uppercase)
                    .frame(minHeight: 44).contentShape(Rectangle())
            }.foregroundStyle(Theme.ink).accessibilityIdentifier("viewJourney")
        }.prestigePanel(padding: 20)
            .onAppear { withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) { appeared = true } }
    }
}

struct DailyStreakCard: View {
    enum Context {
        case result
        case journey
    }

    let presentation: DailyStreakPresentation
    let context: Context
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var identifier: String {
        switch context {
        case .result: "dailyStreakCard"
        case .journey: "journeyDailyStreak"
        }
    }

    private var headline: String {
        switch presentation.message {
        case .syncing: return "Syncing your streak"
        case .unavailable: return "Streak is taking a moment"
        case .firstStep: return "Every run starts somewhere"
        case .active: return "Your daily rhythm"
        case .solved:
            return presentation.current == 1 ? "Day one, solved." : "Aha, you solved today."
        case .held: return "Your streak is safe for today."
        case let .milestone(days): return "Aha, \(days) days running."
        }
    }

    private var detail: String {
        switch presentation.message {
        case .syncing: return "Your result is ready while Journey catches up."
        case .unavailable: return "Your streak will show after its next sync."
        case .firstStep: return "One solve puts your first day on the board."
        case .active: return "One puzzle at a time. Your next connection is yours to find."
        case .solved:
            guard let current = presentation.current else { return "Your daily puzzle is complete." }
            return current == 1 ? "Your first day is on the board." : "\(current) days in a row. Nicely done."
        case .held: return "A tricky puzzle can still be a good day. Tomorrow brings a new connection."
        case let .milestone(days): return "A new mark in your puzzle journey: \(days) days."
        }
    }

    private var ringProgress: Double {
        guard let current = presentation.current else { return 0 }
        guard let nextMilestone = presentation.nextMilestone else { return 1 }
        return min(1, Double(current) / Double(nextMilestone))
    }

    private var currentCountText: String {
        presentation.current.map(String.init) ?? "—"
    }

    private var accessibilitySummary: String {
        var parts = ["Daily streak", headline, detail]
        if let current = presentation.current {
            parts.append("Current streak: \(dayCount(current))")
        }
        if let best = presentation.best {
            parts.append("Best streak: \(dayCount(best))")
        }
        if let target = presentation.nextMilestone, let current = presentation.current {
            let remaining = max(0, target - current)
            parts.append("\(remaining) \(remaining == 1 ? "day" : "days") left to the \(target)-day mark")
        }
        return parts.joined(separator: " ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            header
            if presentation.current != nil || presentation.best != nil {
                milestoneFooter
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.radius)
                .strokeBorder(isMilestone ? Theme.goldDeep : Theme.hairline, lineWidth: 1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
        .accessibilityIdentifier(identifier)
    }

    private var header: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 16))
        return layout {
            medallion
            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 8) {
                    Text("DAILY STREAK")
                        .font(Theme.font(11, weight: .semibold, relativeTo: .caption))
                        .tracking(1.1)
                        .foregroundStyle(Theme.secondary)
                    if isMilestone {
                        Text("MILESTONE")
                            .font(Theme.font(9, weight: .bold, relativeTo: .caption2))
                            .tracking(0.7)
                            .foregroundStyle(Theme.reward)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .overlay(Rectangle().strokeBorder(Theme.goldDeep, lineWidth: 1))
                    }
                }
                Text(headline)
                    .font(Theme.font(19, weight: .semibold, relativeTo: .title3))
                    .fixedSize(horizontal: false, vertical: true)
                Text(detail)
                    .font(Theme.font(14, relativeTo: .body))
                    .foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var medallion: some View {
        ZStack {
            Rectangle().fill(Theme.field)
                .frame(width: 48, height: 48).rotationEffect(.degrees(45))
            Rectangle().strokeBorder(Theme.hairline, lineWidth: 3)
                .frame(width: 48, height: 48).rotationEffect(.degrees(45))
            Rectangle().trim(from: 0, to: ringProgress).stroke(Theme.gold, lineWidth: 3)
                .frame(width: 45, height: 45).rotationEffect(.degrees(-45))
            VStack(spacing: -3) {
                Text(currentCountText)
                    .font(Theme.display(29))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .foregroundStyle(Theme.ink)
                if let current = presentation.current, !dynamicTypeSize.isAccessibilitySize {
                    Text(current == 1 ? "DAY" : "DAYS")
                        .font(Theme.font(8, weight: .bold, relativeTo: .caption2))
                        .tracking(0.7)
                        .foregroundStyle(Theme.secondary)
                }
            }
            .padding(7)
            if isMilestone {
                Image(systemName: "sparkle")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Theme.reward)
                    .offset(x: 27, y: -27)
                    .accessibilityHidden(true)
            }
        }
        .frame(width: 68, height: 68)
        .accessibilityHidden(true)
    }

    private var milestoneFooter: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 14))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 20))
        return layout {
            if let best = presentation.best {
                VStack(alignment: .leading, spacing: 4) {
                    Text("BEST RUN")
                        .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                        .tracking(0.8)
                        .foregroundStyle(Theme.secondary)
                    Text(dayCount(best))
                        .font(Theme.font(17, weight: .semibold, relativeTo: .headline))
                        .monospacedDigit()
                        .accessibilityHidden(true)
                }
            }
            if let target = presentation.nextMilestone, let current = presentation.current {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("NEXT MARK")
                            .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                            .tracking(0.8)
                            .foregroundStyle(Theme.secondary)
                        Spacer(minLength: 8)
                        let remaining = max(0, target - current)
                        Text("\(remaining) \(remaining == 1 ? "day" : "days") left")
                            .font(Theme.font(12, weight: .semibold, relativeTo: .caption))
                            .monospacedDigit()
                            .foregroundStyle(Theme.reward)
                    }
                    ProgressRail(fraction: Double(current) / Double(max(target, 1)))
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 2)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.hairline).frame(height: 1)
        }
    }

    private var isMilestone: Bool {
        if case .milestone = presentation.message { true } else { false }
    }

    private func dayCount(_ value: Int) -> String {
        "\(value) \(value == 1 ? "day" : "days")"
    }
}
