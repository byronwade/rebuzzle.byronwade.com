import SwiftUI
import RebuzzleCore

/// Board header naming the difficulty tier; the hardest tier is drawn in the reward colour.
struct DifficultyBadge: View {
    let difficulty: Int
    var body: some View {
        Text(DifficultyTier.badge(difficulty: difficulty))
            .font(Theme.font(11, weight: .semibold)).monospacedDigit().tracking(0.4)
            .foregroundStyle(difficulty >= 8 ? Theme.reward : Theme.secondary)
            .accessibilityLabel(DifficultyTier.accessibilityLabel(difficulty: difficulty))
    }
}

/// A short burst of confetti for the moment a puzzle clicks. Purely decorative:
/// never intercepts touches, hidden from VoiceOver, and skipped with Reduce Motion.
struct CelebrationBurst: View {
    let isActive: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var startedAt: Date?

    private static let duration: TimeInterval = 1.9
    private static let pieces: [ConfettiPiece] = (0..<42).map(ConfettiPiece.init(seed:))

    var body: some View {
        ZStack {
            // Only exists while a burst plays, so no animation timeline stays alive on a
            // screen that has been navigated away from (that would keep the app from idling).
            if let startedAt {
                TimelineView(.animation) { timeline in
                    Canvas { context, size in
                        let elapsed = timeline.date.timeIntervalSince(startedAt)
                        guard elapsed >= 0, elapsed < Self.duration else { return }
                        for piece in Self.pieces {
                            piece.draw(in: &context, size: size, elapsed: elapsed, duration: Self.duration)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear { startIfNeeded() }
        .onChange(of: isActive) { _, _ in startIfNeeded() }
        .task(id: startedAt) {
            guard startedAt != nil else { return }
            try? await Task.sleep(for: .seconds(Self.duration))
            startedAt = nil
        }
        .onDisappear { startedAt = nil }
    }

    private func startIfNeeded() {
        guard isActive, !reduceMotion, startedAt == nil else { return }
        startedAt = .now
    }
}

private struct ConfettiPiece {
    let angle: Double
    let speed: Double
    let spin: Double
    let width: Double
    let height: Double
    let colorIndex: Int
    let delay: Double

    /// Deterministic pseudo-random spread so every burst looks the same and stays testable.
    init(seed: Int) {
        func unit(_ salt: Int) -> Double {
            var x = UInt64(truncatingIfNeeded: seed &* 2_654_435_761 &+ salt &* 40_503)
            x ^= x >> 13; x = x &* 0x5bd1e995; x ^= x >> 15
            return Double(x % 10_000) / 10_000
        }
        angle = (-160 + 140 * unit(1)) * .pi / 180
        speed = 200 + 190 * unit(2)
        spin = (unit(3) - 0.5) * 14
        width = 6 + 5 * unit(4)
        height = 9 + 7 * unit(5)
        colorIndex = Int(unit(6) * 4) % 4
        delay = 0.12 * unit(7)
    }

    private var color: Color {
        [Theme.reward, Theme.accent, Theme.success, Theme.error][colorIndex]
    }

    func draw(in context: inout GraphicsContext, size: CGSize, elapsed: Double, duration: Double) {
        let t = elapsed - delay
        guard t > 0 else { return }
        let gravity = 720.0
        let origin = CGPoint(x: size.width / 2, y: 90)
        let x = origin.x + cos(angle) * speed * t
        let y = origin.y + sin(angle) * speed * t + 0.5 * gravity * t * t
        let fade = max(0, min(1, (duration - elapsed) / (duration * 0.35)))
        var piece = context
        piece.opacity = fade
        piece.translateBy(x: x, y: y)
        piece.rotate(by: .radians(spin * t))
        let rect = CGRect(x: -width / 2, y: -height / 2, width: width, height: height)
        piece.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(color))
    }
}

/// Horizontal shake for a wrong guess; each increment of `shakes` plays one shake.
struct WrongGuessShake: GeometryEffect {
    var shakes: CGFloat
    var animatableData: CGFloat {
        get { shakes }
        set { shakes = newValue }
    }
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 7 * sin(shakes * .pi * 4), y: 0))
    }
}
