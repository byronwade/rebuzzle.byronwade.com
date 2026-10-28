import SwiftUI
import RebuzzleCore

/// Game-layer tokens and pieces: the HUD, chunky buttons and celebration effects.
/// Data shown here always comes from the server or the confirmed game, never invented.
enum GameRules {
    static let xpPerLevel = 300
}

extension Theme {
    static let flame = Color(red: 1.0, green: 0.55, blue: 0.10)
    static let life = Color(red: 0.95, green: 0.27, blue: 0.33)
    static let bolt = Color(red: 0.98, green: 0.74, blue: 0.16)
    static let go = Color(red: 0.35, green: 0.75, blue: 0.20)
}

/// A raised, tactile button with a solid ledge that presses down, like a game control.
struct ChunkyButtonStyle: ButtonStyle {
    var fill: Color = Theme.accent
    var ink: Color = .white
    var outline: Color? = nil
    var height: CGFloat = 54
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let ledge: CGFloat = 5
    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed && isEnabled
        let top = isEnabled ? fill : Theme.field
        let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)
        configuration.label
            .font(Theme.font(17, weight: .bold))
            .foregroundStyle(isEnabled ? ink : Theme.secondary)
            .frame(maxWidth: .infinity, minHeight: height)
            .padding(.horizontal, 16)
            .background(top, in: shape)
            .overlay { if let outline { shape.strokeBorder(outline, lineWidth: 2) } }
            .offset(y: pressed ? ledge : 0)
            .background { shape.fill(ledgeColor).offset(y: ledge) }
            .padding(.bottom, ledge)
            .contentShape(shape)
            .animation(reduceMotion ? nil : .spring(response: 0.18, dampingFraction: 0.7), value: pressed)
    }
    private var ledgeColor: Color {
        guard isEnabled else { return Theme.secondary.opacity(0.25) }
        return outline ?? fill.mix(with: .black, by: 0.28)
    }
}

// MARK: - HUD

/// Duolingo-style status chips that keep level, streak and lives in view while playing.
struct GameHUDLevelChip: View {
    @Environment(AppModel.self) private var model
    private var progress: JourneyProgress? {
        model.journeySnapshot?.summary.map(JourneyProgress.init(summary:))
    }
    var body: some View {
        Button { model.selectedTab = .journey } label: {
            HStack(spacing: 8) {
                ZStack {
                    Image(systemName: "shield.fill")
                        .font(.system(size: 26))
                        .foregroundStyle(Theme.accent)
                    Text(progress.map { "\($0.level)" } ?? "–")
                        .font(Theme.display(13)).monospacedDigit()
                        .foregroundStyle(.white)
                        .offset(y: -1)
                }
                XPBar(value: progress.map { Double($0.levelXP) / Double(GameRules.xpPerLevel) } ?? 0, tint: Theme.bolt)
                    .frame(width: 52, height: 10)
                    .redacted(reason: progress == nil ? .placeholder : [])
            }
            .padding(.horizontal, 4).frame(minHeight: 44).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(progress.map { "Level \($0.level), \($0.levelXP) of \(GameRules.xpPerLevel) XP" } ?? "Level syncing")
        .accessibilityHint("Opens Journey")
        .accessibilityIdentifier("hudLevel")
    }
}

struct GameHUDStreakChip: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        let streak = model.stats?.streak
        // Like a daily lesson, the flame lights once today’s puzzle is finished.
        let lit = (streak ?? 0) > 0 && model.completedCurrentPuzzle
        HStack(spacing: 4) {
            Image(systemName: "flame.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(lit ? Theme.flame : Theme.secondary.opacity(0.55))
                .symbolEffect(.bounce, value: lit)
            Text(streak.map(String.init) ?? "–")
                .font(Theme.display(17)).monospacedDigit()
                .foregroundStyle(lit ? Theme.flame : Theme.secondary)
                .contentTransition(.numericText())
        }
        .padding(.horizontal, 4).frame(minHeight: 44)
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(streak.map { "\($0) day streak" + (lit ? "" : ", play today to keep it going") } ?? "Streak syncing")
        .accessibilityIdentifier("hudStreak")
    }
}

struct XPBar: View {
    let value: Double
    var tint: Color = Theme.bolt
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.secondary.opacity(0.18))
                Capsule().fill(tint)
                    .frame(width: max(geo.size.height, geo.size.width * min(max(value, 0), 1)))
                    .opacity(value > 0 ? 1 : 0)
                    .overlay(alignment: .top) {
                        // A small gloss stripe sells the "game bar" look.
                        Capsule().fill(.white.opacity(0.35))
                            .frame(height: max(2, geo.size.height * 0.22))
                            .padding(.horizontal, geo.size.height * 0.5).padding(.top, geo.size.height * 0.2)
                            .opacity(value > 0.05 ? 1 : 0)
                    }
            }
        }
        .accessibilityHidden(true)
    }
}

/// Remaining guesses shown as lives.
struct LivesRow: View {
    let attempts: [Guess]
    let maximum: Int
    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<maximum, id: \.self) { index in
                let used = index < attempts.count
                let correct = used && attempts[index].correct
                Image(systemName: correct ? "checkmark.circle.fill" : used ? "heart.slash.fill" : "heart.fill")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(correct ? Theme.go : used ? Theme.secondary.opacity(0.45) : Theme.life)
                    .symbolEffect(.bounce, value: used)
                    .frame(width: 32, height: 32)
            }
        }
        .accessibilityHidden(true)
    }
}

/// Difficulty as bolts out of five, derived from the server’s 1–10 rating.
struct DifficultyBolts: View {
    let difficulty: Int
    var body: some View {
        let filled = Int((Double(min(max(difficulty, 0), 10)) / 2).rounded(.up))
        HStack(spacing: 1) {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: "bolt.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(index < filled ? Theme.bolt : Theme.secondary.opacity(0.25))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Difficulty \(difficulty) out of 10")
    }
}

// MARK: - Celebration

/// A one-shot confetti burst. Hidden entirely when Reduce Motion is on.
struct ConfettiBurst: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()
    private let pieces: [Piece] = (0..<70).map { _ in Piece() }
    private let duration: Double = 2.6
    @State private var finished = false
    var body: some View {
        if !reduceMotion && !finished {
            TimelineView(.animation(paused: finished)) { context in
                let t = context.date.timeIntervalSince(start)
                Canvas { canvas, size in
                    guard t < duration else { return }
                    for piece in pieces {
                        let progress = t / duration
                        let x = size.width * piece.x + piece.drift * CGFloat(t) * 60
                        let y = -20 + piece.speed * CGFloat(t) * 260 + 180 * CGFloat(t * t)
                        guard y < size.height + 20 else { continue }
                        var context = canvas
                        context.opacity = 1 - max(0, progress - 0.7) / 0.3
                        context.translateBy(x: x, y: y)
                        context.rotate(by: .degrees(piece.spin * t * 360))
                        let rect = CGRect(x: -piece.size / 2, y: -piece.size / 4, width: piece.size, height: piece.size / 2)
                        context.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(piece.color))
                    }
                }
            }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
            .onAppear { start = Date() }
            // Stop the animation timeline once the burst is over so the screen can idle.
            .task { try? await Task.sleep(for: .seconds(duration)); finished = true }
        }
    }
    private struct Piece {
        let x = CGFloat.random(in: 0...1)
        let drift = CGFloat.random(in: -1...1)
        let speed = CGFloat.random(in: 0.6...1.4)
        let spin = Double.random(in: -2...2)
        let size = CGFloat.random(in: 8...14)
        let color = [Theme.accent, Theme.flame, Theme.bolt, Theme.go, Theme.life].randomElement()!
    }
}

/// Counts up to a number once, for reward moments.
struct CountUpText: View, @preconcurrency Animatable {
    var value: Double
    var prefix = ""
    var suffix = ""
    var animatableData: Double {
        get { value }
        set { value = newValue }
    }
    var body: some View {
        Text("\(prefix)\(Int(value.rounded()))\(suffix)")
    }
}
