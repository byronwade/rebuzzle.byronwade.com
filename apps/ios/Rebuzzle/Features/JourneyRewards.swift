import SwiftUI
import RebuzzleCore

struct JourneyLevelView: View {
    let progress: JourneyProgress
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "YOUR SOLVER’S CLUB")
            let identityLayout = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 14))
                : AnyLayout(HStackLayout(spacing: 16))
            identityLayout {
                levelBadge
                VStack(alignment: .leading, spacing: 4) {
                    Text("Level \(progress.level)")
                        .font(Theme.font(13, weight: .heavy, relativeTo: .subheadline))
                        .foregroundStyle(Theme.accent)
                        .accessibilityIdentifier("journeyLevel")
                    Text(progress.title)
                        .font(Theme.display(typeSize.isAccessibilitySize ? 30 : 28))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                ChunkyProgressBar(value: Double(progress.levelXP) / 300, tint: Theme.successFill, height: 16)
                    .accessibilityRepresentation {
                        ProgressView(value: Double(progress.levelXP), total: 300)
                            .accessibilityLabel("Level progress")
                            .accessibilityValue("\(progress.levelXP) of 300 XP")
                    }
                ViewThatFits(in: .horizontal) {
                    HStack {
                        xpLabel
                        Spacer(minLength: 12)
                        nextLevelLabel
                    }
                    VStack(alignment: .leading, spacing: 5) { xpLabel; nextLevelLabel }
                }
            }
        }
        .gameCard(padding: 20)
    }
    private var levelBadge: some View {
        let shape = RoundedRectangle(cornerRadius: 24, style: .continuous)
        return Text("\(progress.level)")
            .font(Theme.display(40))
            .monospacedDigit()
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.4)
            .padding(8)
            .frame(width: 82, height: 82)
            .background(shape.fill(Theme.accentFill))
            .background(shape.fill(Theme.accentLedge).offset(y: Theme.ledge))
            .padding(.bottom, Theme.ledge)
            .overlay(alignment: .topTrailing) {
                Image(systemName: "star.fill")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(Theme.onGold)
                    .frame(width: 28, height: 28)
                    .background(Circle().fill(Theme.gold))
                    .background(Circle().fill(Theme.goldLedge).offset(y: 3))
                    .offset(x: 9, y: -9)
            }
            .accessibilityHidden(true)
    }
    private var xpLabel: some View {
        HStack(spacing: 6) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(Theme.reward)
                .accessibilityHidden(true)
            Text("\(progress.totalXP) XP earned")
                .font(Theme.font(15, weight: .heavy))
                .monospacedDigit()
                .accessibilityIdentifier("journeyXP")
        }
    }
    private var nextLevelLabel: some View {
        Text("\(max(0, 300 - progress.levelXP)) to level \(progress.level + 1)")
            .font(Theme.font(13, weight: .semibold, relativeTo: .caption))
            .monospacedDigit()
            .foregroundStyle(Theme.secondary)
    }
}

/// A compact, server-confirmed progression cue for the active daily round.
struct ActiveJourneyProgress: View {
    let progress: JourneyProgress
    var compact = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var displayedXP = 0.0

    private var levelXP: Int { min(300, max(0, progress.levelXP)) }
    private var remainingXP: Int { 300 - levelXP }

    var body: some View {
        Group {
            if compact {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                        .accessibilityHidden(true)
                    Text("LV \(progress.level)")
                        .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                        .tracking(0.25)
                        .fixedSize()
                    ChunkyProgressBar(value: displayedXP / 300, tint: Theme.successFill, height: 8)
                        .frame(width: 42)
                    Text("\(remainingXP) XP to next")
                        .font(Theme.font(10, weight: .medium, relativeTo: .caption))
                        .monospacedDigit()
                        .foregroundStyle(Theme.secondary)
                        .fixedSize()
                        .contentTransition(.numericText())
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 7)
            } else if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(Theme.accent)
                            .accessibilityHidden(true)
                        Text("LEVEL \(progress.level)")
                            .font(Theme.font(12, weight: .semibold, relativeTo: .caption))
                            .tracking(0.35)
                            .foregroundStyle(Theme.accent)
                    }
                    Text(progress.title)
                        .font(Theme.display(24, relativeTo: .title3))
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(levelXP) of 300 XP")
                        .font(Theme.font(14, weight: .medium, relativeTo: .subheadline))
                        .monospacedDigit()
                    xpLabel
                    progressBar
                }
                .padding(16)
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                        .accessibilityHidden(true)
                    Text("LEVEL \(progress.level)")
                        .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                        .tracking(0.35)
                        .fixedSize()
                    progressBar
                    Text("\(remainingXP) XP TO NEXT")
                        .font(Theme.font(10, weight: .medium, relativeTo: .caption))
                        .monospacedDigit()
                        .foregroundStyle(Theme.secondary)
                        .fixedSize()
                        .contentTransition(.numericText())
                }
            }
        }
        .padding(.horizontal, compact ? 0 : typeSize.isAccessibilitySize ? 16 : 24)
        .padding(.vertical, compact ? 0 : typeSize.isAccessibilitySize ? 16 : 8)
        .frame(maxWidth: compact ? nil : 600)
        .frame(maxWidth: compact ? nil : .infinity)
        .background {
            if compact {
                Capsule().fill(Theme.accent.opacity(0.06))
            } else if typeSize.isAccessibilitySize {
                RoundedRectangle(cornerRadius: 18).fill(Theme.panel)
            } else {
                Theme.canvas
            }
        }
        .overlay {
            if !compact && typeSize.isAccessibilitySize {
                RoundedRectangle(cornerRadius: 18)
                    .strokeBorder(Theme.ink.opacity(0.12), lineWidth: 1)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Journey progress")
        .accessibilityValue("Level \(progress.level), \(progress.title), \(levelXP) of 300 XP, \(remainingXP) XP to level \(progress.level + 1)")
        .accessibilityIdentifier("activeJourneyProgress")
        .onAppear(perform: revealProgress)
        .onChange(of: progress.levelXP) { _, _ in revealProgress() }
    }

    private var xpLabel: some View {
        Text(typeSize.isAccessibilitySize ? "\(remainingXP) XP to next level" : "\(remainingXP) XP to next")
            .font(Theme.font(typeSize.isAccessibilitySize ? 14 : 10, weight: .medium, relativeTo: .caption))
            .monospacedDigit()
            .foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var progressBar: some View {
        ChunkyProgressBar(value: displayedXP / 300, tint: Theme.successFill, height: 10)
    }

    private func revealProgress() {
        let target = Double(levelXP)
        guard !reduceMotion else {
            displayedXP = target
            return
        }
        withAnimation(.easeOut(duration: 0.42)) {
            displayedXP = target
        }
    }
}

struct DailyRewardSummary: View {
    let game: GameSession
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var appeared = false
    @State private var displayedPoints = 0

    private var points: Int {
        JourneyProgress.points(won: game.wasSuccessful == true, attempts: game.attempts.count, hintsUsed: model.hintsShown)
    }

    private var stars: Int { game.wasSuccessful == true ? max(1, 4 - game.attempts.count) : 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            let rewardLayout = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
                : AnyLayout(HStackLayout(spacing: 16))
            rewardLayout {
                HStack(spacing: 6) {
                    ForEach(0..<3) { index in
                        Image(systemName: "star.fill")
                            .font(.system(size: 24, weight: .black))
                            .foregroundStyle(index < stars ? Theme.gold : Theme.panelLedge)
                            .shadow(color: index < stars ? Theme.goldLedge : .clear, radius: 0, x: 0, y: 2)
                            .scaleEffect(index < stars && !appeared && !reduceMotion ? 0.6 : 1)
                            .rotationEffect(.degrees(index < stars && !appeared && !reduceMotion ? -14 : 0))
                            .animation(
                                reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.56).delay(Double(index) * 0.12),
                                value: appeared
                            )
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(stars) of 3 stars")

                if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }

                Text("+\(displayedPoints) XP")
                    .font(Theme.display(typeSize.isAccessibilitySize ? 26 : 22, relativeTo: .title3))
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .foregroundStyle(Theme.reward)
                    .accessibilityLabel("\(points) experience points earned")
                    .accessibilityIdentifier("earnedXP")
            }

            Text(game.wasSuccessful == true ? (stars == 3 ? "First guess. Nailed it." : "That’s your daily aha.") : "A new connection, even on the tricky days.")
                .font(Theme.font(14, relativeTo: .subheadline)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .onAppear(perform: revealSummary)
    }

    private func revealSummary() {
        if reduceMotion {
            displayedPoints = points
            appeared = true
            return
        }
        displayedPoints = 0
        withAnimation(.easeOut(duration: 0.72).delay(0.12)) {
            displayedPoints = points
        }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.62).delay(0.08)) {
            appeared = true
        }
    }
}

struct JourneyProgressUpdate: View {
    let game: GameSession
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @AppStorage("haptics") private var haptics = true

    private var confirmedProgress: JourneyProgress? {
        guard let snapshot = model.journeySnapshot,
              snapshot.backfill.status == .complete,
              let summary = snapshot.summary,
              snapshot.recentEntries.contains(where: { entry in
                  entry.puzzleId == game.puzzleId
                      && entry.puzzleDate == game.puzzleDate
                      && entry.attempts == game.attempts.count
                      && entry.outcome == (game.wasSuccessful == true ? .solved : .failed)
              }) else { return nil }
        return JourneyProgress(summary: summary)
    }

    private var newlyEarnedBadges: [JourneyProgress.Badge] {
        guard let celebration = model.journeyBadgeCelebration,
              celebration.puzzleID == game.puzzleId,
              celebration.puzzleDate == game.puzzleDate,
              let progress = confirmedProgress else { return [] }
        return progress.badges.filter { $0.earned && celebration.badgeIDs.contains($0.id) }
    }

    private var newlyEarnedLevel: Int? {
        guard let celebration = model.journeyLevelCelebration,
              celebration.puzzleID == game.puzzleId,
              celebration.puzzleDate == game.puzzleDate,
              let progress = confirmedProgress,
              progress.level >= celebration.level else { return nil }
        return celebration.level
    }

    private var badgeCelebrationKey: String {
        newlyEarnedBadges.map(\.id).sorted().joined(separator: "|")
    }

    private var rewardCelebrationKey: String {
        let levelKey = newlyEarnedLevel.map { "level:\($0)" }
        return ([badgeCelebrationKey, levelKey].compactMap { $0 }.filter { !$0.isEmpty }).joined(separator: "|")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let level = newlyEarnedLevel, let progress = confirmedProgress {
                HStack(spacing: 14) {
                    IconTile(systemImage: "arrow.up", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 48)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("LEVEL UP!")
                            .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                            .tracking(1)
                            .foregroundStyle(Theme.reward)
                        Text("Level \(level) · \(progress.title)")
                            .font(Theme.display(18, relativeTo: .headline))
                            .fixedSize(horizontal: false, vertical: true)
                        Text("A new milestone on your Journey.")
                            .font(Theme.font(12, relativeTo: .caption))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .gameCard(padding: 14)
                .transition(reduceMotion ? .identity : .opacity.combined(with: .scale(scale: 0.95, anchor: .leading)))
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("journeyLevelUp")
            }

            if !newlyEarnedBadges.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Eyebrow(text: newlyEarnedBadges.count == 1 ? "NEW BADGE" : "NEW BADGES")
                    ForEach(newlyEarnedBadges) { badge in
                        HStack(alignment: .center, spacing: 12) {
                            IconTile(systemImage: badge.symbol, face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 44)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(badge.title).font(Theme.font(15, weight: .semibold))
                                Text(badge.detail).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            }
                            Spacer(minLength: 8)
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(Theme.reward)
                                .accessibilityHidden(true)
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
                .gameCard(padding: 14)
                .transition(reduceMotion ? .identity : .opacity.combined(with: .scale(scale: 0.94, anchor: .leading)))
                .accessibilityIdentifier("journeyBadgeUnlock")
            }

            if let progress = confirmedProgress {
                HStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Theme.reward)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 8) {
                        let progressHeader = typeSize.isAccessibilitySize
                            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 5))
                            : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 8))
                        progressHeader {
                            VStack(alignment: .leading, spacing: 3) {
                                Text("YOUR JOURNEY")
                                    .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                                    .tracking(0.8)
                                    .foregroundStyle(Theme.secondary)
                                Text("Level \(progress.level) · \(progress.title)")
                                    .font(Theme.font(14, weight: .semibold, relativeTo: .subheadline))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                            Text("\(progress.levelXP)/300 XP")
                                .font(Theme.font(12, weight: .medium, relativeTo: .caption))
                                .monospacedDigit()
                                .foregroundStyle(Theme.secondary)
                                .lineLimit(1)
                    }
                        ChunkyProgressBar(value: Double(progress.levelXP) / 300, tint: Theme.successFill, height: 12)
                    }
                }
                .padding(.top, 4)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Journey progress")
                .accessibilityValue("Level \(progress.level), \(progress.title), \(progress.levelXP) of 300 XP to level \(progress.level + 1)")
                .accessibilityIdentifier("journeyLevelProgress")
            }

            Button { model.selectedTab = .journey } label: {
                HStack(spacing: 8) {
                    Text("See your Journey")
                    Image(systemName: "arrow.right")
                }
                .font(Theme.font(14, weight: .medium, relativeTo: .subheadline))
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .foregroundStyle(Theme.ink)
            .accessibilityIdentifier("viewJourney")
        }
        .animation(reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.74), value: rewardCelebrationKey)
        .sensoryFeedback(.success, trigger: rewardCelebrationKey) { old, new in
            haptics && old.isEmpty && !new.isEmpty
        }
        .onChange(of: rewardCelebrationKey) { old, new in
            guard old.isEmpty, !new.isEmpty else { return }
            GameSoundPlayer.shared.play(.reward)
        }
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
        .gameCard(padding: 20)
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
                        Pill(text: "MILESTONE", systemImage: "sparkle", tint: Theme.reward)
                    }
                }
                Text(headline)
                    .font(Theme.display(20, relativeTo: .title3))
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
            Circle().fill(Theme.goldLedge).offset(y: Theme.ledge)
            Circle().fill(Theme.gold)
            Circle()
                .trim(from: 0, to: ringProgress)
                .stroke(Theme.goldLedge, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .padding(4)
            VStack(spacing: -2) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 20, weight: .black))
                    .foregroundStyle(Color(hex: 0xE8590C))
                Text(currentCountText)
                    .font(Theme.display(26))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .foregroundStyle(Theme.onGold)
            }
            .padding(10)
        }
        .frame(width: 80, height: 80)
        .padding(.bottom, Theme.ledge)
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
                        .font(Theme.display(18, relativeTo: .headline))
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
                    ChunkyProgressBar(value: Double(current) / Double(max(1, target)), tint: Theme.gold, height: 12)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 14)
        .overlay(alignment: .top) {
            Capsule().fill(Theme.panelLedge).frame(height: 2)
        }
    }

    private var isMilestone: Bool {
        if case .milestone = presentation.message { true } else { false }
    }

    private func dayCount(_ value: Int) -> String {
        "\(value) \(value == 1 ? "day" : "days")"
    }
}
