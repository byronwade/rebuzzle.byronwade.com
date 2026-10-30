import SwiftUI
import RebuzzleCore

/// Full-screen tier-up moment. The root presents one unlock at a time.
struct ChallengeUnlockOverlay: View {
    let unlock: ChallengeUnlock
    let onContinue: () -> Void
    @AppStorage("haptics") private var haptics = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        ZStack {
            Theme.canvas.opacity(0.94).ignoresSafeArea()
            VStack(spacing: 22) {
                Text("CHALLENGE UNLOCKED").font(Theme.label(13)).tracking(2.4).foregroundStyle(Theme.gold)
                ZStack {
                    Rectangle()
                        .strokeBorder(Theme.goldDeep, lineWidth: 2)
                        .frame(width: 128, height: 128)
                        .rotationEffect(.degrees(45))
                    Rectangle()
                        .fill(Theme.panel)
                        .frame(width: 110, height: 110)
                        .rotationEffect(.degrees(45))
                    Image(systemName: unlock.symbol)
                        .font(.system(size: 50, weight: .bold)).foregroundStyle(Theme.gold)
                }
                .frame(width: 190, height: 190)
                .scaleEffect(shown || reduceMotion ? 1 : 0.4)
                .rotationEffect(.degrees(shown || reduceMotion ? 0 : -30))
                .accessibilityHidden(true)
                VStack(spacing: 8) {
                    Text(unlock.title.uppercased()).font(Theme.display(36)).multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                    TierPips(tier: unlock.tier, maxTier: unlock.maxTier, size: 12)
                    Text("+\(unlock.xp) XP").font(Theme.display(28)).foregroundStyle(Theme.gold).padding(.top, 6)
                }
                Button("Continue", action: onContinue).buttonStyle(CommitStyle())
                    .padding(.top, 12)
                    .accessibilityIdentifier("dismissChallengeUnlock")
            }
            .padding(32)
            .frame(maxWidth: 440)
            .opacity(shown ? 1 : 0)
        }
        .foregroundStyle(Theme.ink)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .accessibilityIdentifier("challengeUnlock")
        .onAppear {
            withAnimation(reduceMotion ? .easeOut(duration: 0.2) : .spring(response: 0.5, dampingFraction: 0.62)) { shown = true }
            UIAccessibility.post(notification: .announcement,
                                 argument: "Challenge unlocked: \(unlock.title) tier \(unlock.tier), plus \(unlock.xp) XP")
        }
        .sensoryFeedback(.success, trigger: shown) { _, new in new && haptics }
    }
}
