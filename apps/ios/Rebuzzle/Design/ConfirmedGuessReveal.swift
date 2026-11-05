import SwiftUI

struct ConfirmedGuessReveal: ViewModifier {
    let isNewlyConfirmed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var revealComplete = false

    private var revealPending: Bool {
        isNewlyConfirmed && !reduceMotion && !revealComplete
    }

    func body(content: Content) -> some View {
        content
            .opacity(revealPending ? 0 : 1)
            .offset(y: revealPending ? 12 : 0)
            .scaleEffect(revealPending ? 0.985 : 1)
            .onAppear {
                guard isNewlyConfirmed, !revealComplete else { return }
                guard !reduceMotion else {
                    revealComplete = true
                    return
                }
                withAnimation(.spring(response: 0.4, dampingFraction: 0.82).delay(0.04)) {
                    revealComplete = true
                }
            }
    }
}

extension View {
    func confirmedGuessReveal(isNewlyConfirmed: Bool) -> some View {
        modifier(ConfirmedGuessReveal(isNewlyConfirmed: isNewlyConfirmed))
    }
}
