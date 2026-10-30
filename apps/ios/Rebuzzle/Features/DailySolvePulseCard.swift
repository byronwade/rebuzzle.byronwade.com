import RebuzzleCore
import SwiftUI

struct DailySolvePulseCard: View {
    let puzzleID: String
    let solvedAttemptNumber: Int?
    let isSolved: Bool
    let api: APIClient
    let onViewed: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var isExpanded = false
    @State private var loadState: LoadState = .idle

    private enum LoadState {
        case idle
        case loading
        case loaded(DailySolveDistribution)
        case unavailable
        case failed
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: toggleExpansion) {
                HStack(spacing: 14) {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                        .frame(width: 44, height: 44)
                        .background(Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 14))
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Today’s solving mix")
                            .font(Theme.font(16, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                        Text("See how other solvers worked it out")
                            .font(Theme.font(12))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 6)
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.secondary)
                        .frame(width: 36, height: 44)
                }
                .contentShape(Rectangle())
                .padding(14)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("dailySolvePulseDisclosure")
            .accessibilityValue(isExpanded ? "Expanded" : "Collapsed")
            .accessibilityHint(isExpanded ? "Hide the solving mix." : "Show the solving mix.")

            if isExpanded {
                Rectangle()
                    .fill(Theme.secondary.opacity(0.14))
                    .frame(height: 1)
                    .padding(.horizontal, 14)
                detail
                    .padding(16)
                    .transition(reduceMotion ? .identity : .opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.ink.opacity(0.12), lineWidth: 1))
    }

    @ViewBuilder
    private var detail: some View {
        switch loadState {
        case .idle, .loading:
            HStack(spacing: 10) {
                ProgressView().tint(Theme.accent)
                Text("Gathering today’s solving mix…")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Loading today’s solving mix")
            .accessibilityIdentifier("dailySolvePulseLoading")
        case let .loaded(distribution):
            VStack(alignment: .leading, spacing: 14) {
                Text("Successful solves by guess count")
                    .font(Theme.font(12, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                ForEach(DailySolveBucket.allCases) { bucket in
                    bucketRow(bucket, percentage: distribution.percentage(for: bucket))
                }
                Text("A shared snapshot from today’s solvers.")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.secondary)
                    .padding(.top, 1)
            }
        case .unavailable:
            Label {
                Text("The mix appears after 20 players solve today’s puzzle.")
                    .font(Theme.font(13))
                    .fixedSize(horizontal: false, vertical: true)
            } icon: {
                Image(systemName: "person.2")
                    .foregroundStyle(Theme.accent)
            }
            .foregroundStyle(Theme.secondary)
            .accessibilityElement(children: .combine)
        case .failed:
            VStack(alignment: .leading, spacing: 10) {
                Label("Couldn’t load the solving mix.", systemImage: "wifi.exclamationmark")
                    .font(Theme.font(13, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                Button(action: load) {
                    Label("Try again", systemImage: "arrow.clockwise")
                        .font(Theme.font(13, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("dailySolvePulseRetry")
            }
        }
    }

    private func bucketRow(_ bucket: DailySolveBucket, percentage: Int) -> some View {
        let isPersonalBucket = personalBucket == bucket
        let safePercentage = min(100, max(0, percentage))

        return Group {
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 8) {
                        bucketTitle(bucket, highlighted: isPersonalBucket)
                        Spacer(minLength: 4)
                        bucketPercentage(bucket, percentage: safePercentage)
                        personalMarker(isPersonalBucket)
                    }
                    bucketBar(percentage: safePercentage, highlighted: isPersonalBucket)
                        .frame(height: 9)
                }
            } else {
                HStack(spacing: 10) {
                    bucketTitle(bucket, highlighted: isPersonalBucket)
                        .frame(width: 78, alignment: .leading)
                    bucketBar(percentage: safePercentage, highlighted: isPersonalBucket)
                        .frame(height: 9)
                    bucketPercentage(bucket, percentage: safePercentage)
                        .frame(width: 42, alignment: .trailing)
                    personalMarker(isPersonalBucket)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("dailySolvePulseBucket_\(bucket.id)")
    }

    private var personalBucket: DailySolveBucket? {
        guard isSolved, let solvedAttemptNumber else { return nil }
        return switch solvedAttemptNumber {
        case 1: .oneGuess
        case 2: .twoGuesses
        case 3: .threeGuesses
        case 4...: .fourPlus
        default: nil
        }
    }

    private func bucketTitle(_ bucket: DailySolveBucket, highlighted: Bool) -> some View {
        Text(bucket.title)
            .font(Theme.font(12, weight: highlighted ? .semibold : .medium))
            .foregroundStyle(Theme.ink)
    }

    private func bucketBar(percentage: Int, highlighted: Bool) -> some View {
        GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.field)
                    Capsule()
                        .fill(highlighted ? Theme.accent : Theme.success.opacity(0.74))
                        .frame(width: geometry.size.width * CGFloat(percentage) / 100)
                }
            }
        .accessibilityHidden(true)
    }

    private func bucketPercentage(_ bucket: DailySolveBucket, percentage: Int) -> some View {
        Text("\(percentage)%")
            .font(Theme.font(12, weight: .semibold).monospacedDigit())
            .foregroundStyle(Theme.ink)
            .accessibilityLabel("\(bucket.title), \(percentage) percent")
    }

    @ViewBuilder
    private func personalMarker(_ isPersonalBucket: Bool) -> some View {
        if isPersonalBucket {
            Text("You")
                .font(Theme.font(10, weight: .bold))
                .foregroundStyle(Theme.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Theme.accent.opacity(0.10), in: Capsule())
                .accessibilityIdentifier("dailySolvePulseSelfMarker")
        } else {
            Color.clear.frame(width: 30, height: 1).accessibilityHidden(true)
        }
    }

    private func toggleExpansion() {
        let expand = !isExpanded
        withAnimation(reduceMotion ? nil : .snappy(duration: 0.24)) {
            isExpanded = expand
        }
        guard expand else { return }
        onViewed()
        if case .idle = loadState { load() }
    }

    private func load() {
        loadState = .loading
        Task { @MainActor in
            do {
                let result = try await api.fetchDailySolveDistribution(puzzleID: puzzleID)
                loadState = result.available ? .loaded(result) : .unavailable
            } catch {
                loadState = .failed
            }
        }
    }
}
