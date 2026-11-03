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
        let maximum = max(0, model.game?.maxAttempts ?? 3)
        let remaining = max(0, model.game?.attemptsLeft ?? maximum)
        let scoreLocked = model.game?.scoreLocked == true
        let results: [Bool?] = (0..<maximum).map { index in
            attempts.indices.contains(index) ? attempts[index].correct : nil
        }
        let progressValue = scoreLocked
            ? "Your score is saved. Keep solving."
            : "\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining"
        let turnTitle = scoreLocked
            ? "Score banked"
            : attempts.isEmpty
                ? "Make your move"
                : remaining <= 1
                    ? "One last try"
                    : "Try a new angle"
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))

        return layout {
            attemptTrack(results: results, activeIndex: attempts.count, scoreLocked: scoreLocked)

            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 3) {
                Text(turnTitle)
                    .font(Theme.font(14, weight: .semibold, relativeTo: .subheadline))
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)
                    .accessibilityIdentifier("dailyTurnTitle")
                Text(scoreLocked ? "Keep solving for fun" : "\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining")
                    .font(Theme.font(12, relativeTo: .caption))
                    .foregroundStyle(Theme.secondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("dailyGuessProgress")
        .accessibilityLabel("Guess progress")
        .accessibilityValue(progressValue)
    }

    private func attemptTrack(results: [Bool?], activeIndex: Int, scoreLocked: Bool) -> some View {
        HStack(spacing: 0) {
            ForEach(results.indices, id: \.self) { index in
                let submitted = results[index] != nil
                let correct = results[index] == true
                let active = !scoreLocked && index == activeIndex
                let resolvedColor = correct ? Theme.success : Theme.error

                ZStack {
                    Circle()
                        .fill(active ? Theme.accent : submitted ? resolvedColor.opacity(0.14) : Theme.canvas)
                    Circle()
                        .strokeBorder(
                            active ? Theme.accent : submitted ? resolvedColor.opacity(0.48) : Theme.secondary.opacity(0.25),
                            lineWidth: active ? 1.5 : 1
                        )
                    if active {
                        Circle()
                            .strokeBorder(Theme.accent.opacity(0.25), lineWidth: 3)
                            .padding(-5)
                            .transition(reduceMotion ? .opacity : .scale(scale: 0.8).combined(with: .opacity))
                    }
                    if submitted {
                        Image(systemName: correct ? "checkmark" : "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .transition(reduceMotion ? .opacity : .scale(scale: 0.55).combined(with: .opacity))
                    } else {
                        Text("\(index + 1)")
                            .font(Theme.display(16))
                            .monospacedDigit()
                    }
                }
                .foregroundStyle(submitted ? resolvedColor : active ? Color.white : Theme.secondary)
                .frame(width: 40, height: 40)
                .animation(reduceMotion ? nil : .spring(response: 0.38, dampingFraction: 0.64), value: results)

                if index < results.count - 1 {
                    let connector = results[index].map { $0 ? Theme.success.opacity(0.70) : Theme.error.opacity(0.58) }
                        ?? Theme.secondary.opacity(0.20)
                    Capsule()
                        .fill(connector)
                        .frame(width: 14, height: 3)
                        .animation(reduceMotion ? nil : .easeInOut(duration: 0.28), value: results)
                }
            }
        }
        .accessibilityHidden(true)
    }
}
