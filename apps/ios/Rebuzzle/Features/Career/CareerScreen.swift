import SwiftUI
import RebuzzleCore

/// The Career tab: rank, streak, the weekly trail and the challenges closest to their next tier.
struct CareerScreen: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    private var progress: JourneyProgress? {
        guard let summary = model.journeySnapshot?.summary else { return nil }
        return JourneyProgress(summary: summary)
    }

    var body: some View {
        Page(spacing: 16) {
            DailyStreakCard(presentation: .journey(stats: model.stats), context: .journey)
            if let progress {
                JourneyLevelView(progress: progress)
            } else {
                journeyUnavailable
            }
            if let progress, let summary = model.journeySnapshot?.summary {
                weeklyTrail(progress)
                nextUp
                totals(summary)
            }
            NavigationLink(value: RebuzzleRoute.journal) {
                navigationRow(symbol: "book.closed", title: "Your aha collection", detail: "Revisit the connections you’ve made.")
            }.buttonStyle(.plain).accessibilityIdentifier("openJournal")
            if model.purchases.hasPlus {
                solvingPatterns
            } else {
                NavigationLink(value: RebuzzleRoute.plus(source: .journeyInsights)) {
                    navigationRow(symbol: "chart.bar.xaxis", title: "See your solving patterns", detail: "Guess distribution and more with Plus")
                }.buttonStyle(.plain)
            }
            Text(model.player?.guest == true
                 ? "Career progress belongs to this guest profile. Create an account to carry it to another device; guest journal notes can sync after an upgrade with Plus."
                 : "Career progress syncs with your account. With Plus, your journal notes sync across devices and remain available offline.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            DisclosureGroup("How do I earn XP?") {
                Text("Finish a puzzle: 25 XP. Solve it: +75. Solve on your first guess: +25. Solve without hints: +25. Finish on three different puzzle days in a Monday–Sunday week: +50 XP. Each challenge tier adds 25 to 400 XP. Each level takes 300 XP, and every five levels is a new rank. Revealing the answer still counts toward your weekly challenge.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).padding(.top, 8)
                    .fixedSize(horizontal: false, vertical: true)
            }.font(Theme.font(14)).tint(Theme.ink)
        }
        .navigationTitle("Career").navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.canvas, for: .navigationBar)
        .refreshable {
            await model.refreshJourneyProgress()
            await model.refreshStreakProgress()
        }
    }

    // MARK: Sections

    private var journeyUnavailable: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.journeySyncing { ProgressView().tint(Theme.accent) }
            Text(journeyStatusTitle.uppercased()).font(Theme.display(26))
                .fixedSize(horizontal: false, vertical: true)
            Text(journeyStatusMessage)
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            if !model.journeySyncing {
                Button("Try again") { Task { await model.refreshJourneyProgress() } }
                    .buttonStyle(CommitStyle())
                    .accessibilityIdentifier("retryJourneySync")
            }
        }
        .prestigePanel(padding: 20)
        .accessibilityIdentifier("journeyUnavailable")
    }
    private var journeyStatusTitle: String {
        switch model.journeySnapshot?.backfill.status {
        case .notStarted, .inProgress: "Bringing your career together"
        case .failed: "Career sync needs a retry"
        case .complete: "Career is offline"
        case nil: model.journeySyncError == nil ? "Syncing your career" : "Career unavailable"
        }
    }
    private var journeyStatusMessage: String {
        if model.journeySnapshot?.backfill.status == .notStarted || model.journeySnapshot?.backfill.status == .inProgress {
            return "We’re bringing your past puzzles into your career. Your daily puzzle is ready either way."
        }
        if model.journeySyncError != nil {
            return "Your daily puzzle and private notes are still here. Your career will refresh when you’re back online."
        }
        return "Your career will appear here when progress finishes syncing."
    }

    private func weeklyTrail(_ progress: JourneyProgress) -> some View {
        let days = weekDays()
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Eyebrow(text: "The weekly trail")
                Spacer()
                Text("\(min(progress.weeklyDays, 3))/3").font(Theme.display(22)).monospacedDigit()
                    .foregroundStyle(progress.weeklyDays >= 3 ? Theme.gold : Theme.ink)
            }
            HStack(spacing: 6) {
                ForEach(days, id: \.date) { day in
                    VStack(spacing: 6) {
                        ZStack {
                            Rectangle().fill(day.done ? Theme.gold : Theme.field)
                            Rectangle().strokeBorder(day.isToday ? Theme.gold : Theme.hairline, lineWidth: day.isToday ? 2 : 1)
                            if day.done {
                                Image(systemName: "checkmark").font(.system(size: 13, weight: .heavy)).foregroundStyle(Theme.onGold)
                            }
                        }
                        .frame(height: 38)
                        Text(day.letter).font(Theme.label(11)).foregroundStyle(day.isToday ? Theme.gold : Theme.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityIdentifier("weeklyTrailProgress")
            .accessibilityLabel(weeklyTrailAccessibilityLabel(progress))
            if let reward = model.journeySnapshot?.weeklyTrailReward {
                Text(reward.earned
                     ? "+\(reward.bonusXP) XP earned this week"
                     : "Finish 3 puzzle days this week to earn +\(reward.bonusXP) XP.")
                    .font(Theme.font(14, weight: .semibold))
                    .foregroundStyle(reward.earned ? Theme.reward : Theme.secondary)
                    .accessibilityIdentifier("weeklyTrailReward")
            } else {
                Text("Finish a puzzle on three days this week.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            }
            if model.game?.gameOver != true {
                Button { model.selectedTab = .play } label: { Label("Play today’s puzzle", systemImage: "arrow.right") }
                    .buttonStyle(CommitStyle())
            }
        }
        .prestigePanel(padding: 20)
    }
    private func weeklyTrailAccessibilityLabel(_ progress: JourneyProgress) -> String {
        let days = "\(min(progress.weeklyDays, 3)) of 3 days completed this week"
        guard let reward = model.journeySnapshot?.weeklyTrailReward else { return days }
        return days + ", \(reward.bonusXP) XP reward \(reward.earned ? "earned" : "available")"
    }
    private struct TrailDay { let date: String; let letter: String; let done: Bool; let isToday: Bool }
    private func weekDays() -> [TrailDay] {
        guard let snapshot = model.journeySnapshot, let start = Self.parse(snapshot.currentWeekStart) else { return [] }
        let finished = Set(snapshot.recentEntries.map(\.puzzleDate))
        let letters = ["M", "T", "W", "T", "F", "S", "S"]
        return (0..<7).map { offset in
            let key = Self.format(start.addingTimeInterval(Double(offset) * 86_400))
            return TrailDay(date: key, letter: letters[offset], done: finished.contains(key), isToday: key == snapshot.asOfPuzzleDate)
        }
    }

    @ViewBuilder private var nextUp: some View {
        if let challenges = model.journeySnapshot?.challenges {
            let closest = challenges.lines
                .filter { !$0.secret && !$0.isMaxed }
                .sorted { $0.fractionToNext > $1.fractionToNext }
                .prefix(3)
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline) {
                    Eyebrow(text: "Next up")
                    Spacer()
                    Text("\(challenges.tiersUnlocked)/\(challenges.tiersTotal) TIERS").font(Theme.label(12)).tracking(1)
                        .foregroundStyle(Theme.gold)
                }
                ForEach(Array(closest)) { line in
                    NavigationLink(value: RebuzzleRoute.challenges) { ChallengeRow(line: line) }.buttonStyle(.plain)
                }
                NavigationLink(value: RebuzzleRoute.challenges) {
                    Text("View all challenges")
                }
                .buttonStyle(SecondaryActionStyle())
                .accessibilityIdentifier("openChallenges")
            }
        } else {
            NavigationLink(value: RebuzzleRoute.challenges) {
                navigationRow(symbol: "rosette", title: "Challenges", detail: "Long-haul goals with five tiers each.")
            }.buttonStyle(.plain).accessibilityIdentifier("openChallenges")
        }
    }

    private func totals(_ summary: JourneyProgressSummary) -> some View {
        HStack(spacing: 0) {
            metric("\(summary.finishes)", "Finished")
            Rectangle().fill(Theme.hairline).frame(width: 1)
            metric("\(summary.solves)", "Solved")
            Rectangle().fill(Theme.hairline).frame(width: 1)
            metric("\(summary.firstGuessSolves)", "First guess")
        }
        .fixedSize(horizontal: false, vertical: true)
        .prestigePanel(padding: 0)
    }
    private func metric(_ value: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text(value).font(Theme.display(30)).monospacedDigit()
            Text(label).font(Theme.label(11)).tracking(1).textCase(.uppercase).foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 16)
        .accessibilityElement(children: .combine)
    }

    private var solvingPatterns: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow(text: "How you find the answer")
            ForEach(1...3, id: \.self) { count in
                let wins = model.journal.entries.filter { $0.won && $0.attempts == count }.count
                HStack(spacing: 10) {
                    Text("\(count)").font(Theme.label(13)).monospacedDigit().frame(minWidth: 20, alignment: .leading)
                    ProgressRail(fraction: Double(wins) / Double(max(model.journal.wins, 1)), height: 10)
                    Text("\(wins)").font(Theme.label(13)).monospacedDigit().frame(width: 28, alignment: .trailing)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(wins) puzzles solved in \(count) \(count == 1 ? "guess" : "guesses")")
            }
            let insightsLayout = dynamicTypeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
                : AnyLayout(HStackLayout(alignment: .top, spacing: 16))
            insightsLayout {
                patternMetric("\(model.journal.winRate)%", "Solve rate")
                patternMetric("\(model.journal.entries.filter { $0.won && $0.hintsUsed == 0 }.count)", "Without hints")
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
        .prestigePanel(padding: 20)
    }
    private func patternMetric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(Theme.display(28)).monospacedDigit()
            Text(label).font(Theme.font(13)).foregroundStyle(Theme.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }

    private func navigationRow(symbol: String, title: String, detail: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: symbol).font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.gold)
                .frame(width: 40, height: 40)
                .overlay(Rectangle().strokeBorder(Theme.hairline, lineWidth: 1))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(Theme.font(16, weight: .semibold))
                Text(detail).font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.secondary)
        }
        .foregroundStyle(Theme.ink)
        .prestigePanel(padding: 14)
        .contentShape(Rectangle())
    }

    private static func parse(_ puzzleDate: String) -> Date? {
        let formatter = utcFormatter()
        return formatter.date(from: puzzleDate)
    }
    private static func format(_ date: Date) -> String { utcFormatter().string(from: date) }
    private static func utcFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }
}
