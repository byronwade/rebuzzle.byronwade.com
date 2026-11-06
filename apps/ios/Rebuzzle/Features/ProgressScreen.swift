import SwiftUI
import RebuzzleCore

struct ProgressViewScreen: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    var onOpenMenu: () -> Void = {}
    var onOpenToday: () -> Void = {}
    private var progress: JourneyProgress? {
        guard let summary = model.journeySnapshot?.summary else { return nil }
        return JourneyProgress(summary: summary)
    }

    var body: some View {
        Page {
            if let progress {
                JourneyLevelView(progress: progress)
                DailyStreakCard(presentation: .journey(stats: model.stats), context: .journey)
                weeklyChallenge(progress)
            } else {
                DailyStreakCard(presentation: .journey(stats: model.stats), context: .journey)
                journeyUnavailable
            }
            if model.purchases.hasPlus || !model.journal.entries.isEmpty {
                NavigationLink { JournalView() } label: {
                    linkRow(
                        symbol: "book.closed.fill", face: Theme.gold, ledge: Theme.goldLedge, glyph: Theme.onGold,
                        title: "Your aha collection", detail: "Revisit the connections you’ve made."
                    )
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("openJournal")
            }
            if let progress, let summary = model.journeySnapshot?.summary {
                badgeCollection(progress)
                VStack(alignment: .leading, spacing: 14) {
                    Text("Your story so far").font(Theme.display(22, relativeTo: .title2))
                    let layout = dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 10))
                    layout {
                        metric("\(summary.finishes)", "Finished", tint: Theme.accent)
                        metric("\(summary.solves)", "Solved", tint: Theme.success)
                        metric("\(summary.firstGuessSolves)", "First guess", tint: Theme.reward)
                    }
                }
                .gameCard(padding: 20)
            }
            if model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 16) {
                    Text("How you find the answer").font(Theme.display(22, relativeTo: .title2))
                    ForEach(1...3, id: \.self) { count in
                        let wins = model.journal.entries.filter { $0.won && $0.attempts == count }.count
                        HStack(spacing: 10) {
                            Text("\(count)").monospacedDigit().frame(minWidth: 24, alignment: .leading)
                            ChunkyProgressBar(value: Double(wins) / Double(max(model.journal.wins, 1)), tint: Theme.accentFill, height: 14)
                            Text("\(wins)").monospacedDigit().frame(minWidth: 24)
                        }.font(Theme.font(14, weight: .heavy))
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("\(wins) puzzles solved in \(count) \(count == 1 ? "guess" : "guesses")")
                    }
                    let insightsLayout = dynamicTypeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16))
                        : AnyLayout(HStackLayout(alignment: .top, spacing: 16))
                    insightsLayout {
                        metric("\(model.journal.winRate)%", "Solve rate", tint: Theme.success)
                        metric("\(model.journal.entries.filter { $0.won && $0.hintsUsed == 0 }.count)", "Without hints", tint: Theme.eve)
                    }
                    ForEach(Array(Set(model.journal.entries.map(\.puzzleType))).sorted(), id: \.self) { type in
                        let entries = model.journal.entries.filter { $0.puzzleType == type }
                        HStack {
                            Text(type.replacingOccurrences(of: "-", with: " ").capitalized)
                            Spacer()
                            Text("\(entries.filter(\.won).count) of \(entries.count) solved").foregroundStyle(Theme.secondary)
                        }.font(Theme.font(14))
                    }
                    Text("Based on results saved on this device.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                }
                .gameCard(padding: 20)
            } else {
                NavigationLink { PlusView() } label: {
                    linkRow(
                        symbol: "chart.bar.xaxis", face: Theme.eveFill, ledge: Theme.eveLedge, glyph: .white,
                        title: "See your solving patterns", detail: "Guess distribution and more with Plus"
                    )
                }
                .buttonStyle(.plain)
            }
            Text(model.player?.guest == true
                 ? "Journey progress belongs to this guest profile. Create an account to carry it to another device; journal notes stay on this device."
                 : "Journey progress syncs with your account. Journal notes and puzzle answers stay on this device.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            DisclosureGroup("How do I earn XP?") {
                Text("Finish a puzzle: 25 XP. Solve it: +75. Solve on your first guess: +25. Solve without hints: +25. Each level takes 300 XP. Revealing the answer still counts toward your weekly challenge.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).padding(.top, 8)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .font(Theme.font(15, weight: .heavy)).tint(Theme.ink)
            .frame(minHeight: 44)
            .gameCard(padding: 16)
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            AppScreenHeader(title: "Journey", onOpenMenu: onOpenMenu)
        }
        .toolbar(.hidden, for: .navigationBar)
        .refreshable {
            await model.refreshJourneyProgress()
            await model.refreshStreakProgress()
        }
    }
    private var journeyUnavailable: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.journeySyncing { ProgressView().tint(Theme.accent) }
            Text(journeyStatusTitle).font(Theme.display(26)).fixedSize(horizontal: false, vertical: true)
            Text(journeyStatusMessage)
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Button {
                onOpenToday()
            } label: {
                Label(model.game?.gameOver == true ? "See today’s result" : "Play today’s puzzle", systemImage: "arrow.right")
            }
            .buttonStyle(CommitStyle())
            .accessibilityIdentifier("playFromJourneyUnavailable")
            if !model.journeySyncing {
                Button("Try again") { Task { await model.refreshJourneyProgress() } }
                    .buttonStyle(ChunkyButtonStyle(variant: .secondary, compact: true))
                    .accessibilityIdentifier("retryJourneySync")
            }
        }
            .gameCard(padding: 22)
            .accessibilityIdentifier("journeyUnavailable")
    }
    private var journeyStatusTitle: String {
        switch model.journeySnapshot?.backfill.status {
        case .notStarted, .inProgress: "Bringing your Journey together"
        case .failed: "Journey sync needs a retry"
        case .complete: "Journey is offline"
        case nil: model.journeySyncError == nil ? "Syncing your Journey" : "Journey unavailable"
        }
    }
    private var journeyStatusMessage: String {
        if model.journeySnapshot?.backfill.status == .notStarted || model.journeySnapshot?.backfill.status == .inProgress {
            return "We’re bringing your past puzzles into Journey. Your daily puzzle is ready either way."
        }
        if model.journeySyncError != nil {
            return "Your daily puzzle and private notes are still here. Journey will refresh when you’re back online."
        }
        return "Your Journey will appear here when progress finishes syncing."
    }
    private func weeklyChallenge(_ progress: JourneyProgress) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Eyebrow(text: "THE WEEKLY TRAIL")
                Spacer()
                Pill(text: "\(min(progress.weeklyDays, 3))/3", systemImage: "star.fill", tint: Theme.reward)
            }
            if let snapshot = model.journeySnapshot {
                Text("Week of \(shortDate(snapshot.currentWeekStart)) – \(shortDate(snapshot.currentWeekEnd))")
                    .font(Theme.font(12, weight: .semibold)).foregroundStyle(Theme.secondary)
            }
            Text(progress.weeklyDays >= 3 ? "Three days.\nLook at you." : "A little further\nevery day.")
                .font(Theme.display(30)).tracking(-0.6).fixedSize(horizontal: false, vertical: true)
            Text("Finish a puzzle on three days this week.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 0) {
                ForEach(0..<3) { day in
                    trailStop(day: day, weeklyDays: progress.weeklyDays)
                    if day < 2 {
                        Capsule().fill(day < progress.weeklyDays - 1 ? Theme.gold : Theme.panelLedge)
                            .frame(maxWidth: 32).frame(height: 6).padding(.bottom, 26)
                    }
                }
            }.accessibilityElement(children: .ignore)
                .accessibilityLabel("\(min(progress.weeklyDays, 3)) of 3 days completed this week")
            if model.game?.gameOver != true {
                Button(action: onOpenToday) {
                    HStack(spacing: 10) {
                        Text("Play today’s puzzle")
                        Image(systemName: "play.fill").font(.system(size: 13, weight: .heavy)).accessibilityHidden(true)
                    }
                }
                .buttonStyle(ChunkyButtonStyle(variant: .primary))
            } else {
                Label(progress.weeklyDays >= 3 ? "Trail complete. Every extra day is a bonus." : "Today counts. See you at the next stop.", systemImage: "checkmark.circle.fill")
                    .font(Theme.font(14, weight: .semibold)).foregroundStyle(Theme.success)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .gameCard(padding: 20)
    }
    private func trailStop(day: Int, weeklyDays: Int) -> some View {
        let completed = day < weeklyDays
        let current = day == weeklyDays
        let size: CGFloat = 56
        return VStack(spacing: 8) {
            ZStack {
                if completed {
                    Circle().fill(Theme.goldLedge).offset(y: 4)
                    Circle().fill(Theme.gold)
                    Image(systemName: "star.fill").font(.system(size: 24, weight: .black)).foregroundStyle(Theme.onGold)
                } else {
                    Circle().fill(Theme.panelLedge).offset(y: 4)
                    Circle().fill(Theme.field)
                    Circle().strokeBorder(current ? Theme.accent : Theme.panelLedge, lineWidth: current ? 3 : 2)
                    Image(systemName: current ? "flag.fill" : "star")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(current ? Theme.accent : Theme.secondary)
                }
            }
            .frame(width: size, height: size)
            .padding(.bottom, 4)
            Text("Day \(day + 1)").font(Theme.font(12, weight: .heavy))
                .foregroundStyle(completed ? Theme.reward : Theme.secondary)
        }
        .frame(maxWidth: .infinity)
    }
    private func badgeCollection(_ progress: JourneyProgress) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text("The trophy shelf").font(Theme.display(24))
                Spacer()
                Pill(text: "\(progress.badges.filter(\.earned).count)/\(progress.badges.count)", systemImage: "medal.fill", tint: Theme.reward)
            }
            LazyVGrid(columns: dynamicTypeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], alignment: .leading, spacing: 14) {
                ForEach(progress.badges) { badge in
                    VStack(alignment: .leading, spacing: 10) {
                        MedalView(symbol: badge.symbol, earned: badge.earned)
                        Text(badge.title).font(Theme.font(16, weight: .heavy))
                            .fixedSize(horizontal: false, vertical: true)
                        Text(badge.detail).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                        Text(badge.earned ? "Collected" : "\(badge.progress) of \(badge.goal)")
                            .font(Theme.font(12, weight: .heavy))
                            .monospacedDigit()
                            .foregroundStyle(badge.earned ? Theme.reward : Theme.secondary)
                        ChunkyProgressBar(
                            value: Double(min(badge.progress, badge.goal)) / Double(max(1, badge.goal)),
                            tint: badge.earned ? Theme.gold : Theme.accentFill,
                            height: 10
                        )
                    }
                    .frame(maxWidth: .infinity, minHeight: dynamicTypeSize.isAccessibilitySize ? 0 : 196, alignment: .topLeading)
                    .gameCard(padding: 14)
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
    private func metric(_ value: String, _ label: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(Theme.display(28, relativeTo: .title)).monospacedDigit().foregroundStyle(tint)
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(Theme.font(13, weight: .semibold)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.field, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
    private func linkRow(symbol: String, face: Color, ledge: Color, glyph: Color, title: String, detail: String) -> some View {
        HStack(spacing: 13) {
            IconTile(systemImage: symbol, face: face, ledge: ledge, symbol: glyph, size: 42)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(Theme.font(16, weight: .heavy)).foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(detail).font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.secondary)
                .accessibilityHidden(true)
        }
        .frame(minHeight: 44)
        .gameCard(padding: 14)
        .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }
    private func shortDate(_ puzzleDate: String) -> String {
        let parser = DateFormatter()
        parser.calendar = Calendar(identifier: .gregorian)
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: puzzleDate) else { return puzzleDate }
        let formatter = DateFormatter()
        formatter.locale = .current
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

/// A badge medallion: a gold coin with a ledge when earned, a locked slate disc otherwise.
private struct MedalView: View {
    let symbol: String
    let earned: Bool
    var size: CGFloat = 58

    var body: some View {
        ZStack {
            Circle().fill(earned ? Theme.goldLedge : Theme.secondary.opacity(0.45)).offset(y: 4)
            Circle().fill(earned ? Theme.gold : Theme.panelLedge)
            if earned {
                Circle().strokeBorder(.white.opacity(0.45), lineWidth: 3).padding(5)
            }
            Image(systemName: earned ? symbol : "lock.fill")
                .font(.system(size: size * (earned ? 0.4 : 0.34), weight: .bold))
                .foregroundStyle(earned ? Theme.onGold : Theme.secondary)
        }
        .frame(width: size, height: size)
        .padding(.bottom, 4)
        .accessibilityHidden(true)
    }
}
