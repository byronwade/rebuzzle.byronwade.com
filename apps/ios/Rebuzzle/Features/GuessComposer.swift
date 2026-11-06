import SwiftUI

struct GuessComposer: View {
    struct RecoveryAction {
        let title: String
        let symbol: String
        let accessibilityIdentifier: String
        let isLoading: Bool
        let isDisabled: Bool
        let action: () -> Void
    }

    struct HintAction {
        let title: String
        let detail: String?
        let symbol: String
        let accessibilityLabel: String
        let accessibilityHint: String
        let accessibilityIdentifier: String
        let isDisabled: Bool
        let action: () -> Void
    }

    @Environment(\.dynamicTypeSize) private var typeSize
    @Binding var text: String
    @FocusState.Binding var isFocused: Bool

    let fieldAccessibilityIdentifier: String
    let submitAccessibilityIdentifier: String
    let error: String?
    let isFieldDisabled: Bool
    let isSubmitting: Bool
    let isSubmitDisabled: Bool
    let recoveryAction: RecoveryAction?
    var hintAction: HintAction? = nil
    let onDraftChange: () -> Void
    let onSubmit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let error, !error.isEmpty {
                Notice(message: error)
            }

            inputControls

            if let recoveryAction {
                Button(action: recoveryAction.action) {
                    HStack(spacing: 8) {
                        if recoveryAction.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: recoveryAction.symbol)
                        }
                        Text(recoveryAction.title)
                    }
                }
                .buttonStyle(CommitStyle())
                .disabled(recoveryAction.isDisabled)
                .accessibilityLabel(recoveryAction.title)
                .accessibilityIdentifier(recoveryAction.accessibilityIdentifier)
            }
        }
        .gameCard(padding: 12)
        .frame(maxWidth: 600)
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 6)
        .frame(maxWidth: .infinity)
        .background(Theme.canvas)
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var inputControls: some View {
        if typeSize.isAccessibilitySize {
            VStack(spacing: 10) {
                answerField
                if let hintAction { hintButton(hintAction) }
                submitButton
            }
        } else {
            HStack(spacing: 10) {
                answerField
                if let hintAction { hintButton(hintAction) }
                submitButton
            }
        }
    }

    private var answerField: some View {
        TextField(
            "Your answer",
            text: $text,
            prompt: Text("Type your guess…").foregroundStyle(Theme.secondary),
            axis: .horizontal
        )
        .lineLimit(1...3)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
        .submitLabel(.go)
        .focused($isFocused)
        .modifier(FieldStyle())
        .disabled(isFieldDisabled)
        .accessibilityLabel("Your answer")
        .accessibilityIdentifier(fieldAccessibilityIdentifier)
        .onSubmit { onSubmit() }
        .onChange(of: text) { _, _ in onDraftChange() }
        .layoutPriority(1)
    }

    private var submitButton: some View {
        Button(action: onSubmit) {
            Group {
                if isSubmitting && typeSize.isAccessibilitySize {
                    VStack(spacing: 4) {
                        ProgressView().controlSize(.mini).tint(.white)
                        Text("Checking…")
                            .font(Theme.font(14, weight: .heavy))
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else if isSubmitting {
                    HStack(spacing: 8) {
                        ProgressView().controlSize(.mini).tint(.white)
                        Text("Checking…")
                            .font(Theme.font(14, weight: .heavy))
                            .fixedSize()
                    }
                } else if typeSize.isAccessibilitySize {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.right")
                        Text("Check answer")
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .font(Theme.font(17, weight: .heavy))
                } else {
                    Image(systemName: "arrow.right")
                        .font(.system(size: 20, weight: .black))
                }
            }
            .frame(width: typeSize.isAccessibilitySize ? nil : (isSubmitting ? 92 : 16))
        }
        .buttonStyle(ChunkyButtonStyle(variant: .primary, fullWidth: typeSize.isAccessibilitySize))
        .disabled(isSubmitDisabled)
        .accessibilityLabel(isSubmitting ? "Checking your answer" : "Check answer")
        .accessibilityIdentifier(submitAccessibilityIdentifier)
    }

    private func hintButton(_ action: HintAction) -> some View {
        Button(action: action.action) {
            Group {
                if typeSize.isAccessibilitySize {
                    HStack(alignment: .center, spacing: 12) {
                        Image(systemName: action.symbol)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(action.title)
                                .fixedSize(horizontal: false, vertical: true)
                            if let detail = action.detail {
                                Text(detail)
                                    .font(Theme.font(14, weight: .bold, relativeTo: .caption))
                                    .foregroundStyle(.white.opacity(0.88))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .font(Theme.font(17, weight: .heavy))
                    .multilineTextAlignment(.leading)
                } else {
                    VStack(spacing: 1) {
                        HStack(spacing: 4) {
                            Image(systemName: action.symbol)
                                .accessibilityHidden(true)
                            Text(action.title)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .font(Theme.font(13, weight: .heavy))

                        if let detail = action.detail {
                            Text(detail)
                                .font(Theme.font(10, weight: .bold))
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                                .foregroundStyle(.white.opacity(0.88))
                        }
                    }
                    .frame(width: 58)
                    .frame(minHeight: 36)
                }
            }
        }
        .buttonStyle(ChunkyButtonStyle(variant: .eve, compact: !typeSize.isAccessibilitySize, fullWidth: typeSize.isAccessibilitySize))
        .disabled(action.isDisabled)
        .accessibilityLabel(action.accessibilityLabel)
        .accessibilityHint(action.accessibilityHint)
        .accessibilityIdentifier(action.accessibilityIdentifier)
    }
}
