import SwiftUI
import RebuzzleCore

struct ProgressViewScreen: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    private var progress: JourneyProgress? {
        guard let summary = model.journeySnapshot?.summary else { return nil }
        return JourneyProgress(summary: summary)
    }
    private var activePuzzleDate: String? {
        guard model.game?.gameOver != true,
              model.game?.attempts.isEmpty == false || model.hintsShown > 0 else { return nil }
        return model.daily?.puzzleDate
    }
    private var recentResultsAreComplete: Bool {
        model.player?.guest == true || model.journeySnapshot?.backfill.status == .complete
    }

    var body: some View {
        Page {
            DailyStreakCard(presentation: .journey(stats: model.stats), context: .journey)
            if let progress {
                JourneyLevelView(progress: progress)
            } else {
                journeyUnavailable
            }
            RecentPuzzleStarTrail(
                serverEntries: model.journeySnapshot?.recentEntries ?? [],
                localEntries: model.journal.entries,
                asOfPuzzleDate: model.journeySnapshot?.asOfPuzzleDate,
                currentPuzzleDate: model.daily?.puzzleDate,
                activePuzzleDate: activePuzzleDate,
                historyIsComplete: recentResultsAreComplete
            )
            NavigationLink(value: RebuzzleRoute.journal) {
                HStack(spacing: 12) {
                    Image(systemName: "book.closed").font(.system(size: 22)).foregroundStyle(Theme.reward)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Your aha collection").font(Theme.font(16, weight: .medium))
                        Text("Revisit the connections you’ve made.").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold))
                }.foregroundStyle(Theme.ink).frame(minHeight: 56)
            }.accessibilityIdentifier("openJournal")
            if let progress, let summary = model.journeySnapshot?.summary {
                weeklyChallenge(progress)
                badgeCollection(progress)
                VStack(alignment: .leading, spacing: 16) {
                    Text("Your story so far").font(Theme.font(20, weight: .medium))
                    let layout = dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16)) : AnyLayout(HStackLayout(spacing: 16))
                    layout {
                        metric("\(summary.finishes)", "Finished")
                        metric("\(summary.solves)", "Solved")
                        metric("\(summary.firstGuessSolves)", "First guess")
                    }
                }
            }
            if model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 16) {
                    Text("How you find the answer").font(Theme.font(20, weight: .medium))
                    ForEach(1...3, id: \.self) { count in
                        let wins = model.journal.entries.filter { $0.won && $0.attempts == count }.count
                        HStack {
                            Text("\(count)").monospacedDigit().frame(minWidth: 24, alignment: .leading)
                            GeometryReader { geo in RoundedRectangle(cornerRadius: 3).fill(Theme.ink).frame(width: geo.size.width * CGFloat(wins) / CGFloat(max(model.journal.wins, 1))) }.frame(height: 10)
                            Text("\(wins)").monospacedDigit().frame(width: 24)
                        }.font(Theme.font(13))
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("\(wins) puzzles solved in \(count) \(count == 1 ? "guess" : "guesses")")
                    }
                    let insightsLayout = dynamicTypeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16))
                        : AnyLayout(HStackLayout(alignment: .top, spacing: 16))
                    insightsLayout {
                        metric("\(model.journal.winRate)%", "Solve rate")
                        metric("\(model.journal.entries.filter { $0.won && $0.hintsUsed == 0 }.count)", "Without hints")
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
            } else {
                NavigationLink(value: RebuzzleRoute.plus(source: .journeyInsights)) {
                    HStack { VStack(alignment: .leading, spacing: 6) { Text("See your solving patterns").font(Theme.font(16, weight: .medium)); Text("Guess distribution and more with Plus").font(Theme.font(13)).foregroundStyle(Theme.secondary) }; Spacer(); Image(systemName: "arrow.up.right") }.foregroundStyle(Theme.ink).padding(.vertical, 8)
                }
            }
            Text(model.player?.guest == true
                 ? "Journey progress belongs to this guest profile. Create an account to carry it to another device; guest journal notes can sync after an upgrade with Plus."
                 : "Journey progress syncs with your account. With Plus, your journal notes sync across devices and remain available offline.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            DisclosureGroup("How do I earn XP?") {
                Text("Finish a puzzle: 25 XP. Solve it: +75. Solve on your first guess: +25. Solve without hints: +25. Finish on three different puzzle days in a Monday–Sunday week: +50 XP. Each level takes 300 XP. Revealing the answer still counts toward your weekly challenge.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).padding(.top, 8)
            }.font(Theme.font(14)).tint(Theme.ink)
        }.navigationTitle("Journey").navigationBarTitleDisplayMode(.inline).refreshable {
            await model.refreshJourneyProgress()
            await model.refreshStreakProgress()
        }
    }
    private var journeyUnavailable: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.journeySyncing { ProgressView().tint(Theme.accent) }
            Text(journeyStatusTitle).font(Theme.display(26))
            Text(journeyStatusMessage)
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            if !model.journeySyncing {
                Button("Try again") { Task { await model.refreshJourneyProgress() } }
                    .buttonStyle(CommitStyle())
                    .accessibilityIdentifier("retryJourneySync")
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
            .padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
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
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Eyebrow(text: "THE WEEKLY TRAIL")
                Spacer()
                Text("\(min(progress.weeklyDays, 3))/3")
                    .font(Theme.font(13, weight: .semibold)).monospacedDigit()
            }
            if let snapshot = model.journeySnapshot {
                Text("Week of \(shortDate(snapshot.currentWeekStart)) – \(shortDate(snapshot.currentWeekEnd))")
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            }
            Text(progress.weeklyDays >= 3 ? "Three days.\nLook at you." : "A little further\nevery day.")
                .font(Theme.display(30)).tracking(-0.8).fixedSize(horizontal: false, vertical: true)
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
            HStack(spacing: 0) {
                ForEach(0..<3) { day in
                    let completed = day < progress.weeklyDays
                    let current = day == progress.weeklyDays
                    VStack(spacing: 8) {
                        Image(systemName: completed ? "checkmark" : current ? "flag.fill" : "flag")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(completed ? Theme.panel : current ? Theme.accent : Theme.secondary)
                            .frame(width: 56, height: 56)
                            .background(completed ? Theme.success : Theme.field, in: Circle())
                            .overlay(Circle().strokeBorder(current ? Theme.accent : .clear, lineWidth: 2))
                        Text("Day \(day + 1)").font(Theme.font(12, weight: .medium))
                    }.frame(maxWidth: .infinity)
                    if day < 2 {
                        Rectangle().fill(day < progress.weeklyDays - 1 ? Theme.success : Theme.secondary.opacity(0.25))
                            .frame(maxWidth: 28).frame(height: 2).padding(.bottom, 24)
                    }
                }
            }.accessibilityElement(children: .ignore)
                .accessibilityIdentifier("weeklyTrailProgress")
                .accessibilityLabel(weeklyTrailAccessibilityLabel(progress))
            if model.game?.gameOver != true {
                Button { model.selectedTab = .play } label: { Label("Play today’s puzzle", systemImage: "arrow.right") }
                    .buttonStyle(CommitStyle())
            } else {
                Label(progress.weeklyDays >= 3 ? "Trail complete. Every extra day is a bonus." : "Today counts. See you at the next stop.", systemImage: "checkmark.circle")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }.padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
    }
    private func weeklyTrailAccessibilityLabel(_ progress: JourneyProgress) -> String {
        let days = "\(min(progress.weeklyDays, 3)) of 3 days completed this week"
        guard let reward = model.journeySnapshot?.weeklyTrailReward else { return days }
        return days + ", \(reward.bonusXP) XP reward \(reward.earned ? "earned" : "available")"
    }
    private func badgeCollection(_ progress: JourneyProgress) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("The trophy shelf").font(Theme.display(24))
                Spacer()
                Text("\(progress.badges.filter(\.earned).count)/4")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            LazyVGrid(columns: dynamicTypeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 12) {
                ForEach(progress.badges) { badge in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: badge.symbol)
                                .font(.system(size: 28, weight: .medium))
                                .foregroundStyle(badge.earned ? Theme.reward : Theme.secondary)
                                .frame(height: 40).accessibilityHidden(true)
                            Spacer()
                            Image(systemName: badge.earned ? "checkmark.seal.fill" : "lock")
                                .font(.system(size: 12)).foregroundStyle(badge.earned ? Theme.reward : Theme.secondary)
                                .accessibilityHidden(true)
                        }
                        Text(badge.title).font(Theme.font(16, weight: .semibold))
                            .fixedSize(horizontal: false, vertical: true)
                        Text(badge.detail).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                        Text(badge.earned ? "Collected" : "\(badge.progress) of \(badge.goal)")
                            .font(Theme.font(12, weight: .semibold))
                            .foregroundStyle(badge.earned ? Theme.reward : Theme.secondary)
                        ProgressView(value: Double(min(badge.progress, badge.goal)), total: Double(max(1, badge.goal)))
                            .tint(badge.earned ? Theme.reward : Theme.secondary).accessibilityHidden(true)
                    }.frame(maxWidth: .infinity, minHeight: dynamicTypeSize.isAccessibilitySize ? 0 : 185, alignment: .leading)
                        .padding(16).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                        .accessibilityElement(children: .combine)
                }
            }
        }
    }
    private func metric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(Theme.font(28, weight: .medium, relativeTo: .title)).monospacedDigit()
            Text(label).font(Theme.font(13)).foregroundStyle(Theme.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
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

private struct RecentPuzzleStarTrail: View {
    private enum Outcome {
        case unknown
        case noResult
        case inProgress
        case failed(attempts: Int)
        case solved(attempts: Int, stars: Int)

        var hasRecordedProgress: Bool {
            switch self {
            case .inProgress, .failed, .solved: true
            case .unknown, .noResult: false
            }
        }
    }

    private struct Day: Identifiable {
        let dateKey: String
        let weekday: String
        let dayNumber: String
        let accessibilityLabel: String
        let outcome: Outcome
        let isToday: Bool
        var id: String { dateKey }
    }

    let serverEntries: [JourneyProgressEntry]
    let localEntries: [JournalEntry]
    let asOfPuzzleDate: String?
    let currentPuzzleDate: String?
    let activePuzzleDate: String?
    let historyIsComplete: Bool

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var outcomesByDate: [String: Outcome] {
        var outcomes: [String: Outcome] = [:]
        for entry in serverEntries.sorted(by: { $0.completedAt < $1.completedAt }) {
            switch entry.outcome {
            case .solved:
                outcomes[entry.puzzleDate] = .solved(
                    attempts: entry.attempts,
                    stars: JourneyProgress.stars(won: true, attempts: entry.attempts)
                )
            case .failed:
                outcomes[entry.puzzleDate] = .failed(attempts: entry.attempts)
            }
        }
        for entry in localEntries {
            guard outcomes[entry.puzzleDate] == nil else { continue }
            outcomes[entry.puzzleDate] = entry.won
                ? .solved(attempts: entry.attempts, stars: JourneyProgress.stars(won: true, attempts: entry.attempts))
                : .failed(attempts: entry.attempts)
        }
        if let activePuzzleDate, outcomes[activePuzzleDate] == nil {
            outcomes[activePuzzleDate] = .inProgress
        }
        return outcomes
    }

    private var recentDays: [Day] {
        let recordedDates = serverEntries.map(\.puzzleDate) + localEntries.map(\.puzzleDate)
        let anchorKey = [asOfPuzzleDate, currentPuzzleDate, recordedDates.max()].compactMap { $0 }.max()
        guard let anchorKey else { return [] }

        let utc = TimeZone(secondsFromGMT: 0)!
        let isoFormatter = DateFormatter()
        isoFormatter.calendar = Calendar(identifier: .gregorian)
        isoFormatter.timeZone = utc
        isoFormatter.locale = Locale(identifier: "en_US_POSIX")
        isoFormatter.dateFormat = "yyyy-MM-dd"
        guard let anchorDate = isoFormatter.date(from: anchorKey) else { return [] }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = utc
        let weekdayFormatter = DateFormatter()
        weekdayFormatter.calendar = calendar
        weekdayFormatter.locale = .current
        weekdayFormatter.timeZone = utc
        weekdayFormatter.dateFormat = "EEE"
        let dayNumberFormatter = DateFormatter()
        dayNumberFormatter.calendar = calendar
        dayNumberFormatter.locale = .current
        dayNumberFormatter.timeZone = utc
        dayNumberFormatter.dateFormat = "d"
        let accessibilityFormatter = DateFormatter()
        accessibilityFormatter.calendar = calendar
        accessibilityFormatter.locale = .current
        accessibilityFormatter.timeZone = utc
        accessibilityFormatter.dateFormat = "EEEE, MMMM d"

        let outcomes = outcomesByDate
        return (0..<7).reversed().compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: -offset, to: anchorDate) else { return nil }
            let dateKey = isoFormatter.string(from: date)
            let outcome = outcomes[dateKey] ?? (historyIsComplete ? .noResult : .unknown)
            let isToday = currentPuzzleDate == dateKey
            let dateDescription = accessibilityFormatter.string(from: date)
            let resultDescription: String
            switch outcome {
            case let .solved(attempts, stars):
                resultDescription = "Solved in \(attempts) \(attempts == 1 ? "guess" : "guesses"), \(stars) of 3 stars."
            case let .failed(attempts):
                resultDescription = "Finished after \(attempts) \(attempts == 1 ? "guess" : "guesses"). No stars earned."
            case .inProgress:
                resultDescription = "In progress. No stars yet."
            case .noResult:
                resultDescription = "No completed result recorded."
            case .unknown:
                resultDescription = "Recent result unavailable while Journey syncs."
            }
            let todayPrefix = isToday ? "Today, " : ""
            return Day(
                dateKey: dateKey,
                weekday: weekdayFormatter.string(from: date),
                dayNumber: dayNumberFormatter.string(from: date),
                accessibilityLabel: "\(todayPrefix)\(dateDescription). \(resultDescription)",
                outcome: outcome,
                isToday: isToday
            )
        }
    }

    var body: some View {
        let days = recentDays
        if !days.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: "star.fill").foregroundStyle(Theme.reward).accessibilityHidden(true)
                    Text("Your star trail").font(Theme.font(18, weight: .medium))
                    Spacer(minLength: 8)
                    if historyIsComplete {
                        Text("\(days.filter { $0.outcome.hasRecordedProgress }.count)/7")
                            .font(Theme.font(13, weight: .semibold)).monospacedDigit()
                            .foregroundStyle(Theme.secondary)
                            .accessibilityLabel("\(days.filter { $0.outcome.hasRecordedProgress }.count) of 7 recent dailies with recorded results or an active puzzle")
                    }
                }
                Text(subtitle)
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: dynamicTypeSize.isAccessibilitySize ? 4 : 7), spacing: 6) {
                    ForEach(days) { day in dayCell(day) }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
            .accessibilityIdentifier("recentPuzzleStarTrail")
        }
    }

    private var subtitle: String {
        if !historyIsComplete { return "Some recent results may not be available yet." }
        if activePuzzleDate != nil { return "Your current puzzle is underway. Stars appear when you solve it." }
        if serverEntries.isEmpty && localEntries.isEmpty { return "Finish your first daily to start here." }
        return "Fewer guesses earn more stars."
    }

    private func dayCell(_ day: Day) -> some View {
        VStack(spacing: 6) {
            Text(day.weekday).font(Theme.font(10, weight: .medium)).foregroundStyle(Theme.secondary)
            Text(day.dayNumber).font(Theme.font(14, weight: .semibold)).monospacedDigit()
                .foregroundStyle(day.isToday ? Theme.accent : Theme.ink)
            outcomeMark(for: day)
        }
        .frame(maxWidth: .infinity, minHeight: 74)
        .padding(.vertical, 6)
        .background(Theme.field.opacity(day.outcome.hasRecordedProgress ? 1 : 0.58), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(day.isToday ? Theme.accent.opacity(0.7) : Theme.secondary.opacity(0.12), lineWidth: day.isToday ? 1.5 : 1))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(day.accessibilityLabel)
        .accessibilityIdentifier("recentPuzzleDay.\(day.dateKey)")
    }

    @ViewBuilder
    private func outcomeMark(for day: Day) -> some View {
        switch day.outcome {
        case let .solved(_, stars):
            if dynamicTypeSize.isAccessibilitySize {
                Text("\(stars)/3")
                    .font(Theme.font(11, weight: .semibold)).foregroundStyle(Theme.reward)
                    .accessibilityHidden(true)
            } else {
                HStack(spacing: 1) {
                    ForEach(0..<3, id: \.self) { index in
                        Image(systemName: index < stars ? "star.fill" : "star")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(index < stars ? Theme.reward : Theme.secondary.opacity(0.3))
                    }
                }
                .accessibilityHidden(true)
            }
        case .failed:
            Image(systemName: "minus.circle.fill")
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.secondary)
                .accessibilityHidden(true)
        case .inProgress:
            Image(systemName: "ellipsis.circle.fill")
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.accent)
                .accessibilityHidden(true)
        case .unknown:
            Image(systemName: "questionmark.circle")
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.secondary.opacity(0.55))
                .accessibilityHidden(true)
        case .noResult:
            Image(systemName: "circle.dashed")
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.secondary.opacity(0.4))
                .accessibilityHidden(true)
        }
    }
}
