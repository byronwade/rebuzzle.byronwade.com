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
                            ProgressView().tint(Theme.canvas)
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
        .padding(12)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1))
        .frame(maxWidth: 600)
        .padding(.horizontal, 24)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity)
        .background(Theme.canvas)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.secondary.opacity(0.16)).frame(height: 1)
        }
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
                        ProgressView().controlSize(.mini).tint(Theme.canvas)
                        Text("Checking…")
                            .font(Theme.font(13, weight: .medium))
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.vertical, 4)
                } else if isSubmitting {
                    HStack(spacing: 8) {
                        ProgressView().controlSize(.mini).tint(Theme.canvas)
                        Text("Checking…")
                            .font(Theme.font(13, weight: .medium))
                            .fixedSize()
                    }
                    .padding(.horizontal, typeSize.isAccessibilitySize ? 4 : 12)
                } else if typeSize.isAccessibilitySize {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.right")
                        Text("Check answer")
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .font(Theme.font(16, weight: .medium))
                } else {
                    Image(systemName: "arrow.right")
                        .font(Theme.font(18, weight: .semibold))
                }
            }
            .frame(maxWidth: typeSize.isAccessibilitySize ? .infinity : nil, minHeight: 52)
            .frame(width: typeSize.isAccessibilitySize ? nil : (isSubmitting ? 128 : 52))
            .foregroundStyle(Theme.canvas)
            .background(Theme.ink, in: RoundedRectangle(cornerRadius: 12))
            .contentShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
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
                                    .font(Theme.font(14, weight: .medium, relativeTo: .caption))
                                    .foregroundStyle(Theme.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .font(Theme.font(16, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                    .padding(.horizontal, 12)
                } else {
                    VStack(spacing: 1) {
                        HStack(spacing: 4) {
                            Image(systemName: action.symbol)
                                .accessibilityHidden(true)
                            Text(action.title)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .font(Theme.font(12, weight: .semibold))

                        if let detail = action.detail {
                            Text(detail)
                                .font(Theme.font(10, weight: .medium))
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                                .foregroundStyle(Theme.secondary)
                        }
                    }
                    .frame(width: 82)
                    .frame(minHeight: 52)
                }
            }
            .foregroundStyle(action.isDisabled ? Theme.secondary : Theme.ink)
            .background(
                action.isDisabled ? Theme.field : Theme.reward.opacity(0.14),
                in: RoundedRectangle(cornerRadius: 12)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Theme.reward.opacity(action.isDisabled ? 0.16 : 0.42), lineWidth: 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(action.isDisabled)
        .accessibilityLabel(action.accessibilityLabel)
        .accessibilityHint(action.accessibilityHint)
        .accessibilityIdentifier(action.accessibilityIdentifier)
    }
}
