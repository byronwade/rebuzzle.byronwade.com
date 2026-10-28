import SwiftUI
import RebuzzleCore

struct ProgressViewScreen: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    private var progress: JourneyProgress? {
        guard let summary = model.journeySnapshot?.summary else { return nil }
        return JourneyProgress(summary: summary)
    }

    var body: some View {
        Page {
            DailyStreakCard(presentation: .journey(stats: model.stats), context: .journey)
            if let progress {
                JourneyLevelView(progress: progress)
            } else {
                journeyUnavailable
            }
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
                Text("Finish a puzzle: 25 XP. Solve it: +75. Solve on your first guess: +25. Solve without hints: +25. Each level takes 300 XP. Revealing the answer still counts toward your weekly challenge.")
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
            Text("Finish a puzzle on three days this week.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
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
                .accessibilityLabel("\(min(progress.weeklyDays, 3)) of 3 days completed this week")
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
