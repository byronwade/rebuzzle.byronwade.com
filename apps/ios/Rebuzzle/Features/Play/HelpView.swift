import SwiftUI
import UIKit
import RebuzzleCore

struct HelpView: View {
    @Environment(\.dismiss) private var dismiss
    let firstSession: Bool

    init(firstSession: Bool = false) {
        self.firstSession = firstSession
    }

    var body: some View {
        NavigationStack {
            Page {
                if firstSession {
                    Text("Make it click.").font(Theme.font(30, weight: .medium))
                    Text("Pictures, words, and patterns can combine to make a familiar word or phrase.")
                        .font(Theme.font(17)).fixedSize(horizontal: false, vertical: true)
                    VStack(spacing: 12) {
                        Eyebrow(text: "EXAMPLE")
                        Text("☀️ + 🌼").font(.system(size: 42)).accessibilityLabel("Sun plus flower")
                        Text("Sun + flower = sunflower").font(Theme.font(16, weight: .medium))
                    }
                    .frame(maxWidth: .infinity).padding(20)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                    Text("Three scored guesses. Then keep solving until it clicks.")
                        .font(Theme.font(16, weight: .medium)).fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("Small puzzle. Big aha.").font(Theme.font(30, weight: .medium))
                    Text("A few clues. One hidden connection. Read the pictures, words or patterns, then try the word or phrase that clicks.").font(Theme.font(17))
                    VStack(spacing: 12) {
                        Eyebrow(text: "EXAMPLE")
                        Text("☀️ + 🌼").font(.system(size: 42)).accessibilityLabel("Sun plus flower")
                        Text("Sun + flower = sunflower").font(Theme.font(16, weight: .medium))
                        Text("That’s the aha. Today’s connection is yours to find.").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    }.frame(maxWidth: .infinity).padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                    VStack(alignment: .leading, spacing: 24) {
                        Label("Three scored guesses. Then keep solving.", systemImage: "circle.grid.3x1")
                        Label("Eve reacts to each guess. Hints offer a nudge.", systemImage: "sparkles")
                        Label("A new puzzle at your local midnight.", systemImage: "sunrise")
                        Label("Earn XP, collect badges, challenge a friend.", systemImage: "star")
                    }.font(Theme.font(16))
                    Text("Daily play is free. Plus adds a personal journal and deeper insights, never an advantage.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                    Button("Let’s play") { dismiss() }.buttonStyle(CommitStyle())
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if firstSession {
                    Button { dismiss() } label: {
                        Label("Let’s play", systemImage: "arrow.right")
                    }
                    .buttonStyle(CommitStyle())
                    .accessibilityLabel("Let’s play")
                    .accessibilityIdentifier("quickStartStartPlaying")
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
                    .padding(.bottom, 10)
                    .background(Theme.canvas)
                }
            }
            .navigationTitle(firstSession ? "Your first puzzle" : "How to play")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close", systemImage: "xmark") { dismiss() }
                        .accessibilityIdentifier(firstSession ? "quickStartClose" : "closeHelp")
                }
            }
        }
    }
}
