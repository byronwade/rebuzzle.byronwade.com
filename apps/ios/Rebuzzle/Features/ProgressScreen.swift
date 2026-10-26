import SwiftUI
import RebuzzleCore

struct ProgressViewScreen: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Your daily practice")
                Text("Small moments.\nReal progress.").font(Theme.font(32, weight: .medium, relativeTo: .largeTitle)).tracking(-1)
            }
            HStack(alignment: .top, spacing: 24) {
                metric("\(model.stats?.totalGames ?? model.journal.entries.count)", "Played")
                metric("\(model.stats?.wins ?? model.journal.wins)", "Solved")
                metric("\(model.stats?.streak ?? 0)", "Day streak")
            }
            VStack(alignment: .leading, spacing: 16) {
                Text("Keep showing up.").font(Theme.font(20, weight: .medium))
                HStack {
                    ForEach(week, id: \.key) { day in
                        VStack(spacing: 10) {
                            ZStack {
                                Circle().fill(day.played ? Theme.ink : Theme.panel).frame(width: 32, height: 32)
                                if day.played { Image(systemName: "checkmark").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.canvas) }
                                else { Circle().fill(Theme.secondary.opacity(0.3)).frame(width: 4, height: 4) }
                            }
                            Text(day.label).font(Theme.font(11)).foregroundStyle(Theme.secondary)
                        }.frame(maxWidth: .infinity).accessibilityLabel("\(day.key), \(day.played ? "played" : "not recorded")")
                    }
                }
                Text("Your last seven days on this device. Every completed puzzle counts, solved or revealed.").font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            VStack(alignment: .leading, spacing: 20) {
                Text("A habit worth keeping.").font(Theme.font(20, weight: .medium))
                ForEach([7, 30, 100], id: \.self) { milestone in
                    HStack(spacing: 16) {
                        Image(systemName: model.journal.entries.count >= milestone ? "seal.fill" : "seal").font(.system(size: 26)).foregroundStyle(model.journal.entries.count >= milestone ? Theme.success : Theme.secondary)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(milestone == 7 ? "A week of wonder" : milestone == 30 ? "A curious mind" : "A hundred connections").font(Theme.font(15, weight: .medium))
                            Text("\(min(model.journal.entries.count, milestone)) of \(milestone) daily puzzles").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        }
                        Spacer()
                    }
                }
            }
            if model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 16) {
                    Text("How you find the answer").font(Theme.font(20, weight: .medium))
                    ForEach(1...3, id: \.self) { count in
                        HStack {
                            Text("\(count) guess\(count == 1 ? "" : "es")").frame(width: 80, alignment: .leading)
                            let wins = model.journal.entries.filter { $0.won && $0.attempts == count }.count
                            GeometryReader { geo in RoundedRectangle(cornerRadius: 3).fill(Theme.ink).frame(width: max(4, geo.size.width * CGFloat(wins) / CGFloat(max(model.journal.wins, 1)))) }.frame(height: 10)
                            Text("\(wins)").monospacedDigit().frame(width: 24)
                        }.font(Theme.font(13))
                    }
                    Divider()
                    HStack {
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
                    HStack { VStack(alignment: .leading, spacing: 6) { Text("Get to know your curious mind.").font(Theme.font(16, weight: .medium)); Text("Explore deeper insights with Plus").font(Theme.font(13)).foregroundStyle(Theme.secondary) }; Spacer(); Image(systemName: "arrow.up.right") }.foregroundStyle(Theme.ink).padding(.vertical, 8)
                }
            }
            if model.stats == nil { Notice(message: "Showing results saved on this device. Account statistics refresh when connected.") }
        }.navigationTitle("Progress").navigationBarTitleDisplayMode(.inline).refreshable { await model.load() }
    }
    private func metric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 8) { Text(value).font(Theme.font(36, weight: .medium, relativeTo: .largeTitle)).monospacedDigit(); Text(label).font(Theme.font(13)).foregroundStyle(Theme.secondary) }.frame(maxWidth: .infinity, alignment: .leading)
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
