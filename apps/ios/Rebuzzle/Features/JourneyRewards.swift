import SwiftUI
import RebuzzleCore

struct JourneyLevelView: View {
    let progress: JourneyProgress
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "YOUR SOLVER’S CLUB")
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text("\(progress.level)")
                    .font(Theme.display(typeSize.isAccessibilitySize ? 48 : 72)).monospacedDigit()
                    .foregroundStyle(Theme.accent).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Level \(progress.level)").font(Theme.font(13, weight: .semibold))
                        .accessibilityIdentifier("journeyLevel")
                    Text(progress.title).font(Theme.display(26)).fixedSize(horizontal: false, vertical: true)
                }
            }
            XPBar(value: Double(progress.levelXP) / Double(GameRules.xpPerLevel), tint: Theme.bolt)
                .frame(height: 16)
                .accessibilityLabel("Level progress")
                .accessibilityValue("\(progress.levelXP) of \(GameRules.xpPerLevel) XP")
            ViewThatFits(in: .horizontal) {
                HStack {
                    xpLabel
                    Spacer(minLength: 12)
                    nextLevelLabel
                }
                VStack(alignment: .leading, spacing: 6) { xpLabel; nextLevelLabel }
            }
        }.padding(.vertical, 8)
    }
    private var xpLabel: some View {
        Text("\(progress.totalXP) XP earned").font(Theme.font(14, weight: .semibold))
            .accessibilityIdentifier("journeyXP")
    }
    private var nextLevelLabel: some View {
        Text("\(GameRules.xpPerLevel - progress.levelXP) to level \(progress.level + 1)")
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
                            .font(.system(size: 34, weight: .semibold))
                            .foregroundStyle(index < stars ? Theme.reward : Theme.secondary.opacity(0.5))
                            .scaleEffect(index < stars && !appeared && !reduceMotion ? 0.6 : 1)
                            .rotationEffect(.degrees(index < stars && !appeared && !reduceMotion ? -14 : 0))
                            .animation(
                                reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.56).delay(Double(index) * 0.12),
                                value: appeared
                            )
                    }
                }.accessibilityLabel("\(stars) of 3 stars")
                Spacer()
                CountUpText(value: appeared || reduceMotion ? Double(points) : 0, prefix: "+", suffix: " XP")
                    .font(Theme.display(26)).monospacedDigit()
                    .foregroundStyle(Theme.reward)
                    .accessibilityLabel("+\(points) XP").accessibilityIdentifier("earnedXP")
            }
            Text(game.wasSuccessful == true ? (stars == 3 ? "First guess. Nailed it." : "That’s your daily aha.") : "A new connection, even on the tricky days.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            if let progress = model.journeySnapshot?.summary.map(JourneyProgress.init(summary:)) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("Level \(progress.level)", systemImage: "shield.fill")
                            .font(Theme.font(13, weight: .bold)).foregroundStyle(Theme.accent)
                        Spacer()
                        Text("\(progress.levelXP)/\(GameRules.xpPerLevel) XP")
                            .font(Theme.font(12, weight: .semibold)).monospacedDigit().foregroundStyle(Theme.secondary)
                    }
                    XPBar(value: appeared || reduceMotion ? Double(progress.levelXP) / Double(GameRules.xpPerLevel) : 0, tint: Theme.bolt)
                        .frame(height: 14)
                        .animation(reduceMotion ? nil : .spring(response: 0.9, dampingFraction: 0.8).delay(0.5), value: appeared)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Level \(progress.level), \(progress.levelXP) of \(GameRules.xpPerLevel) XP")
            }
            Button { model.selectedTab = .journey } label: {
                HStack { Text("See your Journey"); Image(systemName: "arrow.right") }
            }.buttonStyle(ChunkyButtonStyle(fill: Theme.panel, ink: Theme.ink, outline: Theme.secondary.opacity(0.25), height: 48))
            .accessibilityIdentifier("viewJourney")
        }.padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.reward.opacity(0.35), lineWidth: 2))
            .onAppear { withAnimation(reduceMotion ? nil : .easeOut(duration: 1.1)) { appeared = true } }
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
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .strokeBorder(Theme.reward.opacity(isMilestone ? 0.48 : 0.24), lineWidth: 1)
        }
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(Theme.reward.opacity(0.08))
                .frame(width: 96, height: 96)
                .blur(radius: 20)
                .offset(x: 16, y: -18)
                .accessibilityHidden(true)
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
                            .background(Theme.reward.opacity(0.12), in: Capsule())
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
            Circle().stroke(Theme.reward.opacity(0.16), lineWidth: 5)
            Circle()
                .trim(from: 0, to: ringProgress)
                .stroke(Theme.reward, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
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
            Image(systemName: isMilestone ? "sparkle" : "circle.fill")
                .font(.system(size: isMilestone ? 12 : 5, weight: .bold))
                .foregroundStyle(Theme.reward)
                .offset(x: 27, y: -25)
                .accessibilityHidden(true)
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
                    ProgressView(value: Double(current), total: Double(target))
                        .tint(Theme.reward)
                        .accessibilityHidden(true)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 2)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.secondary.opacity(0.16)).frame(height: 1)
        }
    }

    private var isMilestone: Bool {
        if case .milestone = presentation.message { true } else { false }
    }

    private func dayCount(_ value: Int) -> String {
        "\(value) \(value == 1 ? "day" : "days")"
    }
}
