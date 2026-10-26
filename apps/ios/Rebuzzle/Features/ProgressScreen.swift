import SwiftUI
import RebuzzleCore

struct ProgressViewScreen: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    private var progress: JourneyProgress { JourneyProgress(entries: model.journal.entries) }

    var body: some View {
        Page {
            JourneyLevelView(progress: progress)
            weeklyChallenge
            NavigationLink { JournalView() } label: {
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
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Text("Little wins. Yours to keep.").font(Theme.font(20, weight: .medium))
                    Spacer()
                    Text("\(progress.badges.filter(\.earned).count)/4").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                ForEach(progress.badges) { badge in
                    HStack(alignment: .top, spacing: 16) {
                        Image(systemName: badge.symbol).font(.system(size: 22, weight: .medium))
                            .foregroundStyle(badge.earned ? Theme.reward : Theme.secondary)
                            .frame(width: 48, height: 48)
                            .background(badge.earned ? Theme.reward.opacity(0.10) : Theme.field, in: RoundedRectangle(cornerRadius: 14))
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(badge.title).font(Theme.font(16, weight: .medium))
                            Text(badge.detail).font(Theme.font(13)).foregroundStyle(Theme.secondary)
                            Text(badge.earned ? "Collected" : "\(badge.progress) of \(badge.goal)")
                                .font(Theme.font(12, weight: .medium)).foregroundStyle(badge.earned ? Theme.reward : Theme.secondary)
                        }
                        Spacer(minLength: 0)
                        if badge.earned { Image(systemName: "checkmark.seal.fill").foregroundStyle(Theme.reward).accessibilityHidden(true) }
                    }.accessibilityElement(children: .combine)
                }
            }
            VStack(alignment: .leading, spacing: 16) {
                Text("Your story so far").font(Theme.font(20, weight: .medium))
                let layout = dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16)) : AnyLayout(HStackLayout(spacing: 16))
                layout {
                    metric("\(model.stats?.totalGames ?? model.journal.entries.count)", "Played")
                    metric("\(model.stats?.wins ?? model.journal.wins)", "Solved")
                    metric("\(model.stats?.streak ?? 0)", "Day streak")
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
                NavigationLink { PlusView() } label: {
                    HStack { VStack(alignment: .leading, spacing: 6) { Text("See your solving patterns").font(Theme.font(16, weight: .medium)); Text("Guess distribution and more with Plus").font(Theme.font(13)).foregroundStyle(Theme.secondary) }; Spacer(); Image(systemName: "arrow.up.right") }.foregroundStyle(Theme.ink).padding(.vertical, 8)
                }
            }
            Text("XP, badges and weekly progress come from completed puzzles saved on this device. Account statistics refresh when connected.")
                .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            DisclosureGroup("How do I earn XP?") {
                Text("Finish a puzzle: 25 XP. Solve it: +75. Solve on your first guess: +25. Solve without hints: +25. Each level takes 300 XP. Revealing the answer still counts toward your weekly challenge.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).padding(.top, 8)
            }.font(Theme.font(14)).tint(Theme.ink)
        }.navigationTitle("Journey").navigationBarTitleDisplayMode(.inline).refreshable { await model.load() }
    }
    private var weeklyChallenge: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text(progress.weeklyDays >= 3 ? "Weekly challenge complete!" : "Your weekly aha challenge")
                    .font(Theme.font(20, weight: .medium))
                Spacer(minLength: 0)
            }
            Text("Finish a puzzle on three days this week.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            HStack(spacing: 12) {
                ForEach(0..<3) { day in
                    Image(systemName: day < progress.weeklyDays ? "checkmark" : "sparkle")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(day < progress.weeklyDays ? Theme.success : Theme.secondary.opacity(0.55))
                        .frame(maxWidth: .infinity).frame(height: 56)
                        .background(Theme.field, in: RoundedRectangle(cornerRadius: 10))
                }
            }.accessibilityElement(children: .ignore)
                .accessibilityLabel("\(min(progress.weeklyDays, 3)) of 3 days completed this week")
            if model.game?.gameOver != true {
                Button { model.selectedTab = .play } label: { Label("Play today’s puzzle", systemImage: "arrow.right") }
                    .buttonStyle(CommitStyle())
            } else {
                Text(progress.weeklyDays >= 3 ? "Nicely done. Every extra day is a bonus." : "Today counts. Another connection awaits tomorrow.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
        }.padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
    }
    private func metric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(Theme.font(28, weight: .medium, relativeTo: .title)).monospacedDigit()
            Text(label).font(Theme.font(13)).foregroundStyle(Theme.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
