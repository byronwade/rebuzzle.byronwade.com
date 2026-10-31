import SwiftUI
import RebuzzleCore

/// One quiet entry point on Journey; hidden until challenge progress has synced.
struct AchievementsRow: View {
    let progress: ChallengeProgress
    var body: some View {
        NavigationLink(value: RebuzzleRoute.achievements) {
            HStack(spacing: 12) {
                Image(systemName: "rosette").font(.system(size: 22)).foregroundStyle(Theme.reward)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Achievements").font(Theme.font(16, weight: .medium))
                    Text("\(progress.tiersUnlocked) of \(progress.tiersTotal) earned").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold))
            }.foregroundStyle(Theme.ink).frame(minHeight: 56)
        }.accessibilityIdentifier("openAchievements")
    }
}

struct AchievementsView: View {
    @Environment(AppModel.self) private var model
    @State private var selected: ChallengeLine?
    var body: some View {
        Page {
            if let progress = model.journeySnapshot?.challenges {
                VStack(spacing: 0) {
                    ForEach(Array(progress.lines.enumerated()), id: \.element.id) { index, line in
                        Button { selected = line } label: { AchievementLineRow(line: line) }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("achievement-\(line.id)")
                        if index < progress.lines.count - 1 { Divider() }
                    }
                }
                .padding(.horizontal, 16)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                Text("Only official daily puzzles count toward achievements.")
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            } else {
                ContentUnavailableView("Achievements unavailable", systemImage: "rosette",
                                       description: Text("They’ll appear once your progress syncs."))
            }
        }
        .navigationTitle("Achievements").navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refreshJourneyProgress() }
        .sheet(item: $selected) { AchievementDetail(line: $0) }
        .accessibilityIdentifier("achievementsList")
    }
}

private struct AchievementLineRow: View {
    let line: ChallengeLine
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: line.isRevealed ? line.symbol : "questionmark")
                .font(.system(size: 18)).frame(width: 28)
                .foregroundStyle(line.tier > 0 ? Theme.reward : Theme.secondary)
            VStack(alignment: .leading, spacing: 3) {
                Text(line.displayTitle).font(Theme.font(15, weight: .medium))
                Text(status).font(Theme.font(12)).foregroundStyle(Theme.secondary)
            }
            Spacer(minLength: 8)
            TierDots(tier: line.tier, maxTier: line.maxTier)
        }
        .foregroundStyle(Theme.ink)
        .frame(minHeight: 56).contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(line.displayTitle), \(line.tier) of \(line.maxTier) tiers. \(status)")
    }
    private var status: String {
        if line.isMaxed { return "Complete" }
        guard line.isRevealed else { return "Secret" }
        if let next = line.nextThreshold, let value = line.value { return "\(next - value) more to go" }
        return line.displayDescription
    }
}

struct TierDots: View {
    let tier: Int
    let maxTier: Int
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<maxTier, id: \.self) { index in
                Circle().fill(index < tier ? Theme.reward : Theme.secondary.opacity(0.25)).frame(width: 7, height: 7)
            }
        }.accessibilityHidden(true)
    }
}

private struct AchievementDetail: View {
    let line: ChallengeLine
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Page {
                Text(line.displayDescription).font(Theme.font(15)).foregroundStyle(Theme.secondary)
                VStack(spacing: 0) {
                    ForEach(Array(line.thresholds.enumerated()), id: \.offset) { index, threshold in
                        let date = line.unlockedAt[index]
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(line.secret ? "Find it" : "Tier \(ChallengeLine.roman(index + 1)) · reach \(threshold)")
                                    .font(Theme.font(15, weight: .medium))
                                Text(date.map { "Earned \(Self.format($0))" } ?? "Not yet").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            }
                            Spacer()
                            Text("+\(line.xp(forTier: index + 1)) XP").font(Theme.font(13, weight: .medium))
                                .foregroundStyle(date == nil ? Theme.secondary : Theme.reward)
                        }
                        .frame(minHeight: 56)
                        .accessibilityElement(children: .combine)
                        if index < line.thresholds.count - 1 { Divider() }
                    }
                }
                .padding(.horizontal, 16)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            }
            .navigationTitle(line.displayTitle).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
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

/// Small top banner for a newly earned tier; dismisses itself after a few seconds.
struct AchievementUnlockBanner: View {
    let unlock: ChallengeUnlock
    let onDismiss: () -> Void
    @AppStorage("haptics") private var haptics = true
    @State private var shown = false
    var body: some View {
        Button(action: onDismiss) {
            HStack(spacing: 10) {
                Image(systemName: unlock.symbol).font(.system(size: 18)).foregroundStyle(Theme.reward)
                Text(title).font(Theme.font(14, weight: .medium)).lineLimit(2)
                Spacer(minLength: 4)
                Text("+\(unlock.xp) XP").font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.reward)
            }
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1))
            .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .accessibilityLabel("\(title), plus \(unlock.xp) XP")
        .accessibilityHint("Dismisses")
        .accessibilityIdentifier("achievementUnlockBanner")
        .sensoryFeedback(.success, trigger: shown) { _, new in new && haptics }
        .task(id: unlock.id) {
            shown = true
            UIAccessibility.post(notification: .announcement, argument: "Achievement unlocked: \(title)")
            try? await Task.sleep(for: .seconds(4))
            onDismiss()
        }
    }
    private var title: String {
        unlock.maxTier > 1 ? "\(unlock.title) \(ChallengeLine.roman(unlock.tier)) unlocked" : "\(unlock.title) unlocked"
    }
}
