import SwiftUI
import RebuzzleCore

/// Diamond-framed rank mark. Original art built from SF Symbols.
struct RankEmblem: View {
    let rank: PrestigeRank
    var size: CGFloat = 32
    var body: some View {
        ZStack {
            Rectangle()
                .fill(Theme.panel)
                .overlay(Rectangle().strokeBorder(Theme.goldDeep, lineWidth: max(1, size / 22)))
                .frame(width: size * 0.74, height: size * 0.74)
                .rotationEffect(.degrees(45))
            Image(systemName: rank.symbol)
                .font(.system(size: size * 0.34, weight: .bold))
                .foregroundStyle(Theme.gold)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

/// Level progress toward the next rank step.
struct XPBar: View {
    let level: Int
    let levelXP: Int
    let totalXP: Int
    var compact = false
    private var fraction: Double { min(1, Double(levelXP) / 300) }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Theme.field)
                    Rectangle().fill(Theme.gold).frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: compact ? 3 : 5)
            if !compact {
                HStack {
                    Text("\(totalXP.formatted()) XP").font(Theme.label(12)).tracking(1).foregroundStyle(Theme.gold)
                    Spacer()
                    Text("\(300 - levelXP) to \(PrestigeRank(level: level).next?.title ?? "max rank")")
                        .font(Theme.label(12)).tracking(1).textCase(.uppercase).foregroundStyle(Theme.secondary)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Experience")
        .accessibilityValue("\(totalXP) XP, \(300 - levelXP) XP to the next level")
    }
}

/// Persistent rank bar at the top of every tab.
struct CareerHeader: View {
    @Environment(AppModel.self) private var model
    var compact = true
    private var summary: JourneyProgressSummary? { model.journeySnapshot?.summary }
    var body: some View {
        let level = summary?.level ?? 1
        let rank = PrestigeRank(level: level)
        if compact {
            HStack(spacing: 10) {
                RankEmblem(rank: rank, size: 30)
                VStack(alignment: .leading, spacing: 5) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(rank.title).font(Theme.label(13)).tracking(1.2).textCase(.uppercase)
                        Spacer(minLength: 8)
                        Text("LV \(level)").font(Theme.label(12)).tracking(1).foregroundStyle(Theme.gold)
                    }
                    XPBar(level: level, levelXP: summary?.xpIntoLevel ?? 0, totalXP: summary?.totalXP ?? 0, compact: true)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Rank \(rank.name) \(rank.subTierNumber), level \(level)")
            .accessibilityIdentifier("careerHeader")
        } else {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 18) {
                    RankEmblem(rank: rank, size: 76)
                    VStack(alignment: .leading, spacing: 4) {
                        Eyebrow(text: "Level \(level)")
                        Text(rank.title.uppercased()).font(Theme.display(34)).foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Rank \(rank.name) \(rank.subTierNumber), level \(level)")
                XPBar(level: level, levelXP: summary?.xpIntoLevel ?? 0, totalXP: summary?.totalXP ?? 0)
            }
            .prestigePanel()
            .accessibilityIdentifier("careerHeader")
        }
    }
}

/// Five diamonds; filled diamonds are unlocked tiers.
struct TierPips: View {
    let tier: Int
    let maxTier: Int
    var size: CGFloat = 9
    var body: some View {
        HStack(spacing: size * 0.7) {
            ForEach(0..<maxTier, id: \.self) { index in
                Rectangle()
                    .fill(index < tier ? Theme.gold : Color.clear)
                    .overlay(Rectangle().strokeBorder(index < tier ? Theme.gold : Theme.muted, lineWidth: 1))
                    .frame(width: size, height: size)
                    .rotationEffect(.degrees(45))
            }
        }
        .padding(.horizontal, 2)
        .accessibilityHidden(true)
    }
}

/// Thin gold progress bar.
struct ProgressRail: View {
    let fraction: Double
    var height: CGFloat = 4
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(Theme.field)
                Rectangle().fill(Theme.gold).frame(width: geo.size.width * min(1, max(0, fraction)))
            }
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }
}

/// One challenge line: icon, title with tier, progress to next tier, tier pips.
struct ChallengeRow: View {
    let line: ChallengeLine
    var body: some View {
        let locked = line.tier == 0
        HStack(spacing: 12) {
            Image(systemName: locked && line.secret ? "lock" : line.symbol)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(locked ? Theme.muted : Theme.gold)
                .frame(width: 40, height: 40)
                .overlay(Rectangle().strokeBorder(locked ? Theme.hairline : Theme.goldDeep, lineWidth: 1))
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(line.tier > 0 && !line.secret ? "\(line.displayTitle) \(ChallengeLine.roman(line.tier))" : line.displayTitle)
                        .font(Theme.font(15, weight: .semibold))
                        .foregroundStyle(locked ? Theme.secondary : Theme.ink)
                        .lineLimit(2)
                    Spacer(minLength: 4)
                    Text(progressText).font(Theme.label(12)).monospacedDigit()
                        .foregroundStyle(line.isMaxed ? Theme.gold : Theme.secondary)
                }
                Text(line.displayDescription).font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                if !line.secret {
                    ProgressRail(fraction: line.fractionToNext).padding(.top, 2)
                }
            }
            if !line.secret { TierPips(tier: line.tier, maxTier: line.maxTier) }
        }
        .padding(12)
        .background(Theme.panel)
        .overlay(Rectangle().strokeBorder(Theme.hairline, lineWidth: 1))
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(line.displayTitle)
        .accessibilityValue(accessibilityValue)
        .accessibilityIdentifier("challengeRow-\(line.id)")
    }
    private var progressText: String {
        if line.secret { return line.tier > 0 ? "FOUND" : "SECRET" }
        guard let next = line.nextThreshold else { return "MAXED" }
        return "\(line.value ?? 0) / \(next)"
    }
    private var accessibilityValue: String {
        if line.secret { return line.tier > 0 ? "Found" : "Secret, not found yet" }
        let base = "Tier \(line.tier) of \(line.maxTier)"
        guard let next = line.nextThreshold else { return base + ", complete" }
        return base + ", \(line.value ?? 0) of \(next)"
    }
}

struct PrestigePanelModifier: ViewModifier {
    var padding: CGFloat = 18
    func body(content: Content) -> some View {
        content.padding(padding).frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.panel)
            .overlay(Rectangle().strokeBorder(Theme.hairline, lineWidth: 1))
    }
}
extension View {
    func prestigePanel(padding: CGFloat = 18) -> some View { modifier(PrestigePanelModifier(padding: padding)) }
}
