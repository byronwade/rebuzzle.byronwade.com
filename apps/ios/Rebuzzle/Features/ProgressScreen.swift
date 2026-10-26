import SwiftUI
import RebuzzleCore

struct ProgressViewScreen: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 16) {
                Eyebrow(text: "Your daily practice")
                let layout = dynamicTypeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16))
                    : AnyLayout(HStackLayout(alignment: .top, spacing: 16))
                layout {
                    metric("\(model.stats?.totalGames ?? model.journal.entries.count)", "Played")
                    metric("\(model.stats?.wins ?? model.journal.wins)", "Solved")
                    metric("\(model.stats?.streak ?? 0)", "Day streak")
                }
            }
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Keep showing up.").font(Theme.font(20, weight: .medium))
                    Text("The last seven days").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                HStack(alignment: .top, spacing: 4) {
                    ForEach(week, id: \.key) { day in
                        VStack(spacing: 8) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(day.played ? Theme.ink : Theme.field)
                                    .frame(height: 40)
                                Image(systemName: day.played ? "checkmark" : "minus")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(day.played ? Theme.canvas : Theme.secondary.opacity(0.5))
                            }
                            Text(day.label).font(Theme.font(11, relativeTo: .caption)).foregroundStyle(Theme.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("\(day.key), \(day.played ? "played" : "not recorded")")
                    }
                }
                Text("Every completed puzzle counts, solved or revealed. Activity is saved on this device.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            VStack(alignment: .leading, spacing: 16) {
                Text("Milestones").font(Theme.font(20, weight: .medium))
                ForEach([7, 30, 100], id: \.self) { milestone in
                    milestoneRow(milestone)
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
            if model.stats == nil { Notice(message: "Showing results saved on this device. Account statistics refresh when connected.") }
        }.navigationTitle("Progress").navigationBarTitleDisplayMode(.inline).refreshable { await model.load() }
    }
    private func metric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) { Text(value).font(Theme.font(36, weight: .medium, relativeTo: .largeTitle)).monospacedDigit(); Text(label).font(Theme.font(13)).foregroundStyle(Theme.secondary) }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func milestoneRow(_ milestone: Int) -> some View {
        let completed = min(model.journal.entries.count, milestone)
        let achieved = completed == milestone
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: achieved ? "checkmark.seal.fill" : "seal")
                .font(.system(size: 22, weight: .regular))
                .foregroundStyle(achieved ? Theme.success : Theme.secondary)
                .frame(width: 28, height: 28)
            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(milestone == 7 ? "A week of wonder" : milestone == 30 ? "A curious mind" : "A hundred connections")
                        .font(Theme.font(15, weight: .medium))
                    Text("\(completed) of \(milestone) daily puzzles")
                        .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                }
                ProgressView(value: Double(completed), total: Double(milestone))
                    .tint(achieved ? Theme.success : Theme.ink)
                    .accessibilityHidden(true)
            }
        }.accessibilityElement(children: .combine)
    }

    private var week: [(key: String, label: String, played: Bool)] {
        let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"; formatter.locale = Locale(identifier: "en_US_POSIX")
        return (-6...0).compactMap { offset in
            guard let date = Calendar.current.date(byAdding: .day, value: offset, to: Date()) else { return nil }
            let key = formatter.string(from: date)
            return (key, date.formatted(.dateTime.weekday(.narrow)), model.journal.entries.contains { $0.puzzleDate == key })
        }
    }
}
