import SwiftUI
import RebuzzleCore

struct PuzzleArenaView: View {
    let puzzle: Puzzle
    let onStudy: () -> Void

    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(spacing: 12) {
            stageHeader
                .padding(.horizontal, 16)
                .padding(.top, 14)

            PuzzleBoard(puzzle: puzzle)
                .padding(16)
                .frame(maxWidth: .infinity)
                .background(Theme.canvas, in: RoundedRectangle(cornerRadius: 18))
                .overlay {
                    RoundedRectangle(cornerRadius: 18)
                        .strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1)
                }

            attemptHeader
                .padding(.horizontal, 16)
                .padding(.bottom, 14)
        }
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
        .overlay {
            RoundedRectangle(cornerRadius: 24)
                .strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("dailyPuzzleArena")
    }

    @ViewBuilder private var stageHeader: some View {
        if typeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .center, spacing: 8) {
                    Text(puzzle.typeName)
                        .font(Theme.font(15, weight: .semibold, relativeTo: .body))
                    Spacer(minLength: 4)
                    DifficultyBadge(difficulty: puzzle.difficulty)
                        .accessibilityIdentifier("dailyDifficultyTier")
                }
                Button(action: onStudy) {
                    Label("Study puzzle", systemImage: "arrow.up.left.and.arrow.down.right")
                        .font(Theme.font(14, weight: .semibold, relativeTo: .body))
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.accent)
                .accessibilityIdentifier("studyPuzzle")
            }
        } else {
            HStack(alignment: .center, spacing: 12) {
                Text(puzzle.typeName)
                    .font(Theme.font(13, weight: .semibold, relativeTo: .caption))
                Spacer(minLength: 4)
                DifficultyBadge(difficulty: puzzle.difficulty)
                    .accessibilityIdentifier("dailyDifficultyTier")
                Button(action: onStudy) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 16, weight: .medium))
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.accent)
                .accessibilityLabel("Study puzzle")
                .accessibilityIdentifier("studyPuzzle")
            }
        }
    }

    private var attemptHeader: some View {
        let attempts = model.game?.attempts ?? []
        let maximum = model.game?.maxAttempts ?? 3
        let remaining = model.game?.attemptsLeft ?? maximum
        let progressValue = model.game?.scoreLocked == true
            ? "Your score is saved. Keep solving."
            : "\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining"
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))

        return layout {
            HStack(spacing: 8) {
                ForEach(0..<maximum, id: \.self) { index in
                    let submitted = index < attempts.count
                    let active = index == attempts.count
                    let correct = submitted && attempts[index].correct
                    let resultColor = correct ? Theme.success : Theme.error
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(active ? Theme.accent : submitted ? resultColor.opacity(0.13) : Theme.canvas)
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(
                                active ? Theme.accent : submitted ? resultColor.opacity(0.45) : Theme.secondary.opacity(0.25),
                                lineWidth: 1
                            )
                        if submitted {
                            Image(systemName: correct ? "checkmark" : "xmark")
                                .font(.system(size: 15, weight: .bold))
                                .transition(reduceMotion ? .opacity : .scale(scale: 0.55).combined(with: .opacity))
                        } else {
                            Text("\(index + 1)")
                                .font(Theme.display(18))
                                .monospacedDigit()
                        }
                    }
                    .foregroundStyle(submitted ? resultColor : active ? Color.white : Theme.secondary)
                    .frame(width: 44, height: 44)
                    .shadow(color: active ? Theme.accent.opacity(0.20) : .clear, radius: 0, x: 0, y: 3)
                    .animation(reduceMotion ? nil : .spring(response: 0.38, dampingFraction: 0.64), value: model.game?.attempts.count)
                }
            }
            .accessibilityHidden(true)

            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 3) {
                Text(model.game?.scoreLocked == true ? "Take your time" : "Your move")
                    .font(Theme.font(14, weight: .semibold, relativeTo: .subheadline))
                Text(model.game?.scoreLocked == true ? "Your score is saved" : "\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining")
                    .font(Theme.font(12, relativeTo: .caption))
                    .foregroundStyle(Theme.secondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("dailyGuessProgress")
        .accessibilityLabel("Guess progress")
        .accessibilityValue(progressValue)
    }
}
