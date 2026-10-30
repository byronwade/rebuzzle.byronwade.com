import SwiftUI
import RebuzzleCore

/// Every challenge line, locked ones included, filterable by category.
struct ChallengesWall: View {
    @Environment(AppModel.self) private var model
    @State private var category: ChallengeCategoryID?
    @State private var selected: ChallengeLine?

    var body: some View {
        Page(spacing: 18) {
            if let progress = model.journeySnapshot?.challenges {
                header(progress)
                filters(progress)
                LazyVStack(spacing: 8) {
                    ForEach(lines(progress)) { line in
                        Button { selected = line } label: { ChallengeRow(line: line) }
                            .buttonStyle(.plain)
                    }
                }
                Text("Challenges count official daily puzzles only. Practice rounds never change them.")
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                unavailable
            }
        }
        .navigationTitle("Challenges").navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.canvas, for: .navigationBar)
        .refreshable { await model.refreshJourneyProgress() }
        .sheet(item: $selected) { line in ChallengeDetail(line: line) }
        .accessibilityIdentifier("challengesWall")
    }

    private func header(_ progress: ChallengeProgress) -> some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Eyebrow(text: "Tiers unlocked")
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(progress.tiersUnlocked)").font(Theme.display(44)).foregroundStyle(Theme.gold)
                    Text("/ \(progress.tiersTotal)").font(Theme.display(22)).foregroundStyle(Theme.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Eyebrow(text: "Mastery")
                Text("\(progress.masteredCount) / \(progress.categories.count)").font(Theme.display(26))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(progress.tiersUnlocked) of \(progress.tiersTotal) tiers unlocked, \(progress.masteredCount) of \(progress.categories.count) categories mastered")
    }

    private func filters(_ progress: ChallengeProgress) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                chip("All", isOn: category == nil) { category = nil }
                ForEach(progress.categories) { item in
                    chip(item.title, isOn: category == item.id, mastered: item.mastered) { category = item.id }
                }
            }
        }
        .scrollClipDisabled()
    }

    private func chip(_ title: String, isOn: Bool, mastered: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if mastered { Image(systemName: "crown.fill").font(.system(size: 10)) }
                Text(title).font(Theme.label(12)).tracking(1.1).textCase(.uppercase)
            }
            .padding(.horizontal, 12).frame(minHeight: 36)
            .foregroundStyle(isOn ? Theme.onGold : Theme.secondary)
            .background(isOn ? Theme.gold : Color.clear)
            .overlay(Rectangle().strokeBorder(isOn ? Theme.gold : Theme.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(mastered ? "\(title), mastered" : title)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func lines(_ progress: ChallengeProgress) -> [ChallengeLine] {
        guard let category else { return progress.lines }
        return progress.lines.filter { $0.category == category }
    }

    private var unavailable: some View {
        VStack(alignment: .leading, spacing: 12) {
            if model.journeySyncing { ProgressView().tint(Theme.gold) }
            Text("CHALLENGES ARE UPDATING").font(Theme.display(26))
            Text("Your challenge progress appears here once it syncs. Finished puzzles still count while you wait.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            if !model.journeySyncing {
                Button("Try again") { Task { await model.refreshJourneyProgress() } }
                    .buttonStyle(CommitStyle())
            }
        }
        .prestigePanel(padding: 20)
        .accessibilityIdentifier("challengesUnavailable")
    }
}

/// Every tier of one line, with threshold, XP and unlock date.
private struct ChallengeDetail: View {
    let line: ChallengeLine
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Page(spacing: 20) {
                HStack(spacing: 14) {
                    Image(systemName: line.symbol)
                        .font(.system(size: 26, weight: .semibold)).foregroundStyle(Theme.gold)
                        .frame(width: 60, height: 60)
                        .overlay(Rectangle().strokeBorder(Theme.goldDeep, lineWidth: 1))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Eyebrow(text: line.category.rawValue)
                        Text(line.displayTitle.uppercased()).font(Theme.display(30))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Text(line.displayDescription).font(Theme.font(16)).foregroundStyle(Theme.secondary)
                if let value = line.value, !line.secret {
                    Text("Current: \(value)").font(Theme.label(13)).tracking(1).textCase(.uppercase)
                }
                VStack(spacing: 0) {
                    ForEach(Array(line.thresholds.enumerated()), id: \.offset) { index, threshold in
                        let tier = index + 1
                        let date = line.unlockedAt[index]
                        HStack(spacing: 14) {
                            Text(line.secret ? "★" : ChallengeLine.roman(tier))
                                .font(Theme.display(20)).frame(width: 40, alignment: .leading)
                                .foregroundStyle(date == nil ? Theme.muted : Theme.gold)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(line.secret ? "Find it" : "Reach \(threshold)").font(Theme.font(15, weight: .semibold))
                                Text(date.map { "Unlocked \(Self.format($0))" } ?? "Locked")
                                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            }
                            Spacer()
                            Text("+\(line.xp(forTier: tier)) XP").font(Theme.label(12)).monospacedDigit()
                                .foregroundStyle(date == nil ? Theme.secondary : Theme.gold)
                        }
                        .padding(.vertical, 14)
                        .accessibilityElement(children: .combine)
                        if index < line.thresholds.count - 1 { Rectangle().fill(Theme.hairline).frame(height: 1) }
                    }
                }
                .prestigePanel(padding: 16)
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Theme.canvas)
    }

    private static func format(_ puzzleDate: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: puzzleDate) else { return puzzleDate }
        return date.formatted(Date.FormatStyle(date: .abbreviated, time: .omitted, timeZone: TimeZone(secondsFromGMT: 0)!))
    }
}
