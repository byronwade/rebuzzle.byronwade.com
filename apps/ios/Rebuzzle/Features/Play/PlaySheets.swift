import SwiftUI
import UIKit
import RebuzzleCore

struct DailyThoughtSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @FocusState private var editorFocused: Bool
    @State private var thought = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pick up where you left off.")
                            .font(Theme.display(30))
                            .tracking(-0.6)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Jot down a connection, a hunch, or what you want to try next.")
                            .font(Theme.font(15))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("TODAY’S THOUGHT")
                                .font(Theme.font(11, weight: .semibold))
                                .tracking(1.1)
                                .foregroundStyle(Theme.secondary)
                            Spacer()
                            Text("\(thought.count)/600")
                                .font(Theme.font(12, weight: .medium))
                                .monospacedDigit()
                                .foregroundStyle(Theme.secondary)
                                .accessibilityLabel("\(thought.count) of 600 characters")
                        }
                        ZStack(alignment: .topLeading) {
                            if thought.isEmpty {
                                Text("What have you noticed so far?")
                                    .font(.body)
                                    .foregroundStyle(Theme.secondary.opacity(0.78))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 9)
                                    .allowsHitTesting(false)
                            }
                            TextEditor(text: $thought)
                                .font(.body)
                                .foregroundStyle(Theme.ink)
                                .scrollContentBackground(.hidden)
                                .focused($editorFocused)
                                .accessibilityLabel("Private thought for today’s puzzle")
                                .accessibilityHint("Saved on this device and never sent to Eve or submitted as a guess.")
                                .accessibilityIdentifier("dailyThoughtEditor")
                        }
                        .frame(minHeight: 176)
                        .padding(8)
                        .background(Theme.canvas, in: RoundedRectangle(cornerRadius: Theme.radius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.20), lineWidth: 1))
                        Text("Saved on this device for today’s puzzle. It is never sent to Eve, submitted as a guess, or shared.")
                            .font(Theme.font(12))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if !thought.isEmpty {
                        Button("Clear thought", systemImage: "trash") {
                            thought = ""
                            editorFocused = false
                            model.saveDailyThought("")
                        }
                        .font(Theme.font(14, weight: .semibold))
                        .foregroundStyle(Theme.secondary)
                        .frame(minHeight: 44, alignment: .leading)
                        .accessibilityIdentifier("clearDailyThought")
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Theme.canvas.ignoresSafeArea())
            .navigationTitle("Save a thought")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        editorFocused = false
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .accessibilityIdentifier("closeDailyThought")
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { editorFocused = false }
                        .accessibilityIdentifier("dismissDailyThoughtKeyboard")
                }
            }
            .onAppear { thought = model.dailyThought }
            .onChange(of: model.dailyThought) { _, updated in
                if thought != updated { thought = updated }
            }
            .onChange(of: model.canSaveDailyThought) { _, canSave in
                guard !canSave else { return }
                thought = ""
                editorFocused = false
                dismiss()
            }
            .onChange(of: thought) { _, updated in
                let bounded = String(updated.prefix(600))
                if bounded != updated { thought = bounded }
                model.saveDailyThought(bounded)
            }
        }
        .presentationDetents(typeSize.isAccessibilitySize ? [.large] : [.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

struct PuzzleStudy: Identifiable {
    let id = UUID()
    let puzzle: Puzzle
}

struct PuzzleStudyView: View {
    @Environment(\.dismiss) private var dismiss
    let puzzle: Puzzle

    var body: some View {
        NavigationStack {
            Page {
                Text("Take your time. Your guesses stay here.")
                    .font(Theme.font(16)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                PuzzleBoard(puzzle: puzzle)
                    .padding(16)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.20), lineWidth: 1))
            }
            .navigationTitle("Study puzzle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close", systemImage: "xmark") { dismiss() }
                        .accessibilityIdentifier("closeStudyPuzzle")
                }
            }
        }
    }
}
