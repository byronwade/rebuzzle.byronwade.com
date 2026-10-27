import SwiftUI
import RebuzzleCore

struct JourneyLevelView: View {
    let progress: JourneyProgress
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "YOUR SOLVER’S CLUB")
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text("\(progress.level)")
                    .font(Theme.display(typeSize.isAccessibilitySize ? 48 : 72)).monospacedDigit()
                    .foregroundStyle(Theme.accent).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Level \(progress.level)").font(Theme.font(13, weight: .semibold))
                        .accessibilityIdentifier("journeyLevel")
                    Text(progress.title).font(Theme.display(26)).fixedSize(horizontal: false, vertical: true)
                }
            }
            ProgressView(value: Double(progress.levelXP), total: 300)
                .tint(Theme.accent)
                .accessibilityLabel("Level progress")
                .accessibilityValue("\(progress.levelXP) of 300 XP")
            ViewThatFits(in: .horizontal) {
                HStack {
                    xpLabel
                    Spacer(minLength: 12)
                    nextLevelLabel
                }
                VStack(alignment: .leading, spacing: 6) { xpLabel; nextLevelLabel }
            }
        }.padding(.vertical, 8)
    }
    private var xpLabel: some View {
        Text("\(progress.totalXP) XP earned").font(Theme.font(14, weight: .semibold))
            .accessibilityIdentifier("journeyXP")
    }
    private var nextLevelLabel: some View {
        Text("\(300 - progress.levelXP) to level \(progress.level + 1)")
            .font(Theme.font(12)).foregroundStyle(Theme.secondary)

    }
}

struct JourneyRewards: View {
    let game: GameSession
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    private var points: Int { JourneyProgress.points(won: game.wasSuccessful == true, attempts: game.attempts.count, hintsUsed: model.hintsShown) }
    private var stars: Int { game.wasSuccessful == true ? max(1, 4 - game.attempts.count) : 0 }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    ForEach(0..<3) { index in
                        Image(systemName: index < stars ? "star.fill" : "star")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(index < stars ? Theme.reward : Theme.secondary.opacity(0.5))
                            .scaleEffect(index < stars && !appeared && !reduceMotion ? 0.6 : 1)
                            .rotationEffect(.degrees(index < stars && !appeared && !reduceMotion ? -14 : 0))
                            .animation(
                                reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.56).delay(Double(index) * 0.12),
                                value: appeared
                            )
                    }
                }.accessibilityLabel("\(stars) of 3 stars")
                Spacer()
                Text("+\(points) XP").font(Theme.font(20, weight: .semibold)).monospacedDigit()
                    .foregroundStyle(Theme.reward).accessibilityIdentifier("earnedXP")
            }
            Text(game.wasSuccessful == true ? (stars == 3 ? "First guess. Nailed it." : "That’s your daily aha.") : "A new connection, even on the tricky days.")
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
            Button { model.selectedTab = .journey } label: {
                HStack { Text("See your Journey"); Spacer(); Image(systemName: "arrow.right") }
                    .font(Theme.font(14, weight: .medium)).frame(minHeight: 44).contentShape(Rectangle())
            }.foregroundStyle(Theme.ink).accessibilityIdentifier("viewJourney")
        }.padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            .onAppear { withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) { appeared = true } }
    }
}
