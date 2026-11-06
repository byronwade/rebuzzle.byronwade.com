import SwiftUI

// Thorbis OKLCH tokens converted to sRGB at design time. System chrome stays native.
enum Theme {
    static let canvas = adaptive(light: 0xF7F5EF, dark: 0x101010)
    static let panel = adaptive(light: 0xFFFFFF, dark: 0x171717)
    static let field = adaptive(light: 0xECEAE5, dark: 0x070707)
    static let ink = adaptive(light: 0x202020, dark: 0xF7F4ED)
    static let secondary = adaptive(light: 0x62615E, dark: 0xB8B9BE)
    static let accent = Color(red: 0.22, green: 0.39, blue: 0.86)
    static let success = adaptive(light: 0x26733C, dark: 0x8FC29A)
    static let reward = adaptive(light: 0x8B5915, dark: 0xEDBF74)
    static let chill = adaptive(light: 0x2B7286, dark: 0x8CC9D3)
    static let error = adaptive(light: 0xB32D37, dark: 0xF59A9E)
    static func font(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo: Font.TextStyle = .body) -> Font {
        Font.custom("Inter-Regular", size: size, relativeTo: relativeTo).weight(weight)
    }
    /// A distinct display voice for the game; utility copy stays Inter.
    static func display(_ size: CGFloat, relativeTo textStyle: Font.TextStyle = .largeTitle) -> Font {
        Font.custom("ArialRoundedMTBold", size: size, relativeTo: textStyle)
    }
    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
        })
    }
}
struct CommitStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(Theme.font(16, weight: .medium))
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(Theme.canvas)
            .background(Theme.ink.opacity(configuration.isPressed ? 0.8 : 1), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.secondary.opacity(0.25), lineWidth: 1))
            .compositingGroup()
            .shadow(color: Theme.ink.opacity(0.22), radius: 0, y: configuration.isPressed ? 0 : 3)
            .offset(y: configuration.isPressed ? 2 : 0)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
struct FieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content.font(Theme.font(17)).padding(16)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.secondary.opacity(0.22), lineWidth: 1))
    }
}
struct Eyebrow: View {
    let text: String
    var body: some View { Text(text).font(Theme.font(12, weight: .medium, relativeTo: .caption)).foregroundStyle(Theme.secondary) }
}
struct Page<Content: View>: View {
    private let spacing: CGFloat
    private let onNearBottomChange: ((Bool) -> Void)?
    private let scrollTrackingReady: Bool
    private let content: Content
    @State private var isUserScrolling = false
    @State private var didReportInitialScrollPosition = false
    @State private var hasUserScrolled = false

    init(
        spacing: CGFloat = 24,
        onNearBottomChange: ((Bool) -> Void)? = nil,
        scrollTrackingReady: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.spacing = spacing
        self.onNearBottomChange = onNearBottomChange
        self.scrollTrackingReady = scrollTrackingReady
        self.content = content()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: spacing) { content }
                .padding(.horizontal, 24).padding(.vertical, 20).frame(maxWidth: 600).frame(maxWidth: .infinity)
        }
        .onScrollGeometryChange(for: PageScrollMetrics.self) { geometry in
            PageScrollMetrics(geometry: geometry, isReady: scrollTrackingReady)
        } action: { previous, current in
            let userOffsetChanged = isUserScrolling && abs(current.contentOffsetY - previous.contentOffsetY) > 0.5
            if userOffsetChanged { hasUserScrolled = true }
            guard current.isReady else { return }
            guard didReportInitialScrollPosition else {
                didReportInitialScrollPosition = true
                onNearBottomChange?(current.isNearBottom)
                return
            }
            if !previous.isReady && !hasUserScrolled {
                onNearBottomChange?(current.isNearBottom)
                return
            }
            guard userOffsetChanged,
                  previous.isNearBottom != current.isNearBottom else { return }
            onNearBottomChange?(current.isNearBottom)
        }
        .onScrollPhaseChange { _, phase, context in
            isUserScrolling = phase == .interacting || phase == .decelerating
            if phase == .interacting, didReportInitialScrollPosition {
                let metrics = PageScrollMetrics(geometry: context.geometry, isReady: scrollTrackingReady)
                if metrics.isReady { onNearBottomChange?(metrics.isNearBottom) }
            }
        }
        .scrollDismissesKeyboard(.interactively)
            .background(Theme.canvas).foregroundStyle(Theme.ink)
    }
}
private struct PageScrollMetrics: Equatable {
    let contentOffsetY: CGFloat
    let isNearBottom: Bool
    let isReady: Bool

    init(geometry: ScrollGeometry, isReady: Bool) {
        contentOffsetY = geometry.contentOffset.y
        isNearBottom = max(0, geometry.contentSize.height - geometry.visibleRect.maxY) <= 24
        self.isReady = isReady
    }
}
struct Notice: View {
    let message: String
    var body: some View { Label(message, systemImage: "info.circle").font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true).accessibilityElement(children: .combine) }
}
