import SwiftUI
import RebuzzleCore

struct JourneyLevelView: View {
    let progress: JourneyProgress
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 20)) : AnyLayout(HStackLayout(spacing: 24))
        layout {
            if typeSize.isAccessibilitySize {
                Text("Level \(progress.level)")
                    .font(Theme.font(20, weight: .medium, relativeTo: .title3))
                    .foregroundStyle(Theme.accent)
                    .accessibilityIdentifier("journeyLevel")
            } else {
            ZStack {
                Circle().stroke(Theme.field, lineWidth: 8)
                Circle().trim(from: 0, to: CGFloat(progress.levelXP) / 300)
                    .stroke(Theme.accent, style: StrokeStyle(lineWidth: 8, lineCap: .round)).rotationEffect(.degrees(-90))
                VStack(spacing: 2) {
                    Text("LEVEL").font(Theme.font(10, weight: .semibold)).tracking(1)
                    Text("\(progress.level)").font(Theme.font(36, weight: .semibold)).monospacedDigit()
                }
            }.frame(width: 112, height: 112).accessibilityElement(children: .ignore).accessibilityLabel("Level \(progress.level)")
            }
            VStack(alignment: .leading, spacing: 8) {
                Text(progress.title).font(Theme.font(26, weight: .semibold, relativeTo: .title)).tracking(-0.5)
                Text("\(progress.totalXP) XP earned").font(Theme.font(15, weight: .medium)).accessibilityIdentifier("journeyXP")
                Text("\(300 - progress.levelXP) XP to your next level")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
        }.padding(.vertical, 8)
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
                            .scaleEffect(appeared || reduceMotion ? 1 : 0.7)
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
