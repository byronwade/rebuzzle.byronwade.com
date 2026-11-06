import SwiftUI
import UIKit

// Toy-box game tokens. See docs/superpowers/specs/2026-11-05-ios-toybox-design.md.
// Semantic colors (accent, success, error, reward, eve) are text- and icon-safe on canvas and panel in both modes.
// Their `…Fill` partners are button and badge faces that carry white labels (gold carries ink).
enum Theme {
    static let canvas = adaptive(light: 0xEAF4FF, dark: 0x0E1726)
    static let panel = adaptive(light: 0xFFFFFF, dark: 0x1A2638)
    static let panelLedge = adaptive(light: 0xC9DDF3, dark: 0x070D17)
    static let field = adaptive(light: 0xF2F7FD, dark: 0x111C2D)
    static let ink = adaptive(light: 0x10223D, dark: 0xF2F6FC)
    static let secondary = adaptive(light: 0x4E6283, dark: 0xA8B6CC)

    static let accent = adaptive(light: 0x1F66D9, dark: 0x7AAEFF)
    static let success = adaptive(light: 0x237836, dark: 0x6FD07E)
    static let reward = adaptive(light: 0x9A5800, dark: 0xFFC21A)
    static let error = adaptive(light: 0xD13438, dark: 0xFF8A8E)
    static let eve = adaptive(light: 0x6B4BE0, dark: 0xB9A6FF)
    static let chill = adaptive(light: 0x1F6E85, dark: 0x8CC9D3)

    static let accentFill = adaptive(light: 0x1F66D9, dark: 0x2F6FDB)
    static let accentLedge = adaptive(light: 0x154AA3, dark: 0x1A4590)
    static let successFill = adaptive(light: 0x26803A, dark: 0x2E8540)
    static let successLedge = adaptive(light: 0x1A5C29, dark: 0x1D5A2B)
    static let gold = Color(hex: 0xFFC21A)
    static let goldLedge = Color(hex: 0xC98E00)
    static let errorFill = adaptive(light: 0xD13438, dark: 0xD23C40)
    static let errorLedge = adaptive(light: 0x9E2226, dark: 0x9A2427)
    static let eveFill = adaptive(light: 0x6B4BE0, dark: 0x7A5CE8)
    static let eveLedge = adaptive(light: 0x4B2FB5, dark: 0x5238B8)
    /// Ink that stays dark in both modes, for labels on gold.
    static let onGold = Color(hex: 0x10223D)

    static let cardRadius: CGFloat = 22
    static let buttonRadius: CGFloat = 16
    static let ledge: CGFloat = 5

    /// SF Pro Rounded at `size`, scaled with Dynamic Type relative to `relativeTo`.
    static func font(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo: Font.TextStyle = .body) -> Font {
        rounded(size, weight: weight, relativeTo: relativeTo)
    }
    /// Heavy rounded display voice for headlines, scores and levels.
    static func display(_ size: CGFloat, relativeTo textStyle: Font.TextStyle = .largeTitle) -> Font {
        rounded(size, weight: .heavy, relativeTo: textStyle)
    }

    enum Motion {
        static let press = Animation.spring(response: 0.18, dampingFraction: 0.7)
        static let pop = Animation.spring(response: 0.35, dampingFraction: 0.6)
        static let settle = Animation.spring(response: 0.5, dampingFraction: 0.85)
    }

    private static func rounded(_ size: CGFloat, weight: Font.Weight, relativeTo: Font.TextStyle) -> Font {
        let base = UIFont.systemFont(ofSize: size, weight: weight.uiWeight)
        let descriptor = base.fontDescriptor.withDesign(.rounded) ?? base.fontDescriptor
        let scaled = UIFontMetrics(forTextStyle: relativeTo.uiTextStyle).scaledFont(for: UIFont(descriptor: descriptor, size: size))
        return Font(scaled)
    }
    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
    }
}
extension Color {
    init(hex: UInt32) { self.init(uiColor: UIColor(hex: hex)) }
}
private extension Font.Weight {
    var uiWeight: UIFont.Weight {
        switch self {
        case .ultraLight: .ultraLight
        case .thin: .thin
        case .light: .light
        case .medium: .medium
        case .semibold: .semibold
        case .bold: .bold
        case .heavy: .heavy
        case .black: .black
        default: .regular
        }
    }
}
private extension Font.TextStyle {
    var uiTextStyle: UIFont.TextStyle {
        switch self {
        case .largeTitle: .largeTitle
        case .title: .title1
        case .title2: .title2
        case .title3: .title3
        case .headline: .headline
        case .subheadline: .subheadline
        case .callout: .callout
        case .footnote: .footnote
        case .caption: .caption1
        case .caption2: .caption2
        default: .body
        }
    }
}

// MARK: - Chunky buttons

enum ChunkyVariant {
    case primary, success, reward, eve, secondary, destructive

    var face: Color {
        switch self {
        case .primary: Theme.accentFill
        case .success: Theme.successFill
        case .reward: Theme.gold
        case .eve: Theme.eveFill
        case .secondary: Theme.panel
        case .destructive: Theme.errorFill
        }
    }
    var ledge: Color {
        switch self {
        case .primary: Theme.accentLedge
        case .success: Theme.successLedge
        case .reward: Theme.goldLedge
        case .eve: Theme.eveLedge
        case .secondary: Theme.panelLedge
        case .destructive: Theme.errorLedge
        }
    }
    var label: Color {
        switch self {
        case .reward: Theme.onGold
        case .secondary: Theme.ink
        default: .white
        }
    }
}

/// A tactile game button: a solid face over a same-hue ledge that sinks when pressed.
struct ChunkyButtonStyle: ButtonStyle {
    var variant: ChunkyVariant = .primary
    var compact = false
    var fullWidth = true

    func makeBody(configuration: Configuration) -> some View {
        ChunkyButton(configuration: configuration, variant: variant, compact: compact, fullWidth: fullWidth)
    }
}
/// The original commit button name; every commit action is now a primary chunky button.
typealias CommitStyle = ChunkyButtonStyle

private struct ChunkyButton: View {
    let configuration: ButtonStyleConfiguration
    let variant: ChunkyVariant
    let compact: Bool
    let fullWidth: Bool
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let depth: CGFloat = compact ? 4 : Theme.ledge
        let pressed = configuration.isPressed && isEnabled
        let shape = RoundedRectangle(cornerRadius: compact ? 13 : Theme.buttonRadius, style: .continuous)
        configuration.label
            .font(Theme.font(compact ? 15 : 17, weight: .heavy, relativeTo: .headline))
            .foregroundStyle(variant.label)
            .multilineTextAlignment(.center)
            .padding(.horizontal, compact ? 14 : 20)
            .padding(.vertical, compact ? 8 : 12)
            .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: compact ? 40 : 52)
            .background(shape.fill(variant.face))
            .overlay {
                if variant == .secondary { shape.strokeBorder(Theme.panelLedge, lineWidth: 2) }
            }
            .offset(y: pressed ? depth : 0)
            .background(shape.fill(variant.ledge).offset(y: depth))
            .padding(.bottom, depth)
            .opacity(isEnabled ? 1 : 0.5)
            .contentShape(Rectangle())
            .animation(reduceMotion ? nil : Theme.Motion.press, value: pressed)
            .sensoryFeedback(.impact(weight: .light), trigger: pressed) { _, new in new }
    }
}

// MARK: - Cards, pills and progress

/// A panel face with a solid ledge under it — the container for every game surface.
struct GameCardModifier: ViewModifier {
    var tint: Color?
    var ledgeTint: Color?
    var padding: CGFloat

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(shape.fill(tint ?? Theme.panel))
            .overlay(shape.strokeBorder(Theme.panelLedge.opacity(tint == nil ? 1 : 0), lineWidth: 2))
            .background(shape.fill(ledgeTint ?? Theme.panelLedge).offset(y: Theme.ledge))
            .padding(.bottom, Theme.ledge)
    }
}
extension View {
    func gameCard(tint: Color? = nil, ledge: Color? = nil, padding: CGFloat = 18) -> some View {
        modifier(GameCardModifier(tint: tint, ledgeTint: ledge, padding: padding))
    }
}

/// A small rounded label: an icon and short text on a tinted capsule.
struct Pill: View {
    let text: String
    var systemImage: String?
    var tint: Color = Theme.accent

    var body: some View {
        HStack(spacing: 5) {
            if let systemImage { Image(systemName: systemImage).font(.system(size: 12, weight: .bold)).accessibilityHidden(true) }
            Text(text).font(Theme.font(13, weight: .heavy, relativeTo: .caption)).monospacedDigit()
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(tint.opacity(0.14), in: Capsule())
        .accessibilityElement(children: .combine)
    }
}

/// A square, colored icon tile with its own ledge, used to lead rows and cards.
struct IconTile: View {
    let systemImage: String
    var face: Color = Theme.accentFill
    var ledge: Color = Theme.accentLedge
    var symbol: Color = .white
    var size: CGFloat = 46

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
        Image(systemName: systemImage)
            .font(.system(size: size * 0.42, weight: .bold))
            .foregroundStyle(symbol)
            .frame(width: size, height: size)
            .background(shape.fill(face))
            .background(shape.fill(ledge).offset(y: 4))
            .padding(.bottom, 4)
            .accessibilityHidden(true)
    }
}

/// A rounded track with a ledge and an animated fill.
struct ChunkyProgressBar: View {
    let value: Double
    var tint: Color = Theme.successFill
    var height: CGFloat = 14
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { proxy in
            let clamped = min(max(value, 0), 1)
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.panelLedge)
                Capsule().fill(tint)
                    .frame(width: clamped == 0 ? 0 : max(height, proxy.size.width * clamped))
                    .overlay(alignment: .top) {
                        Capsule().fill(.white.opacity(0.28)).frame(height: height * 0.28).padding(.horizontal, height * 0.35).padding(.top, height * 0.18)
                    }
            }
            .animation(reduceMotion ? nil : Theme.Motion.settle, value: clamped)
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }
}

/// Three tiles for the three scored guesses: open, missed (×) or solved (✓).
struct GuessSlots: View {
    enum Slot: Equatable { case open, missed, solved }
    let slots: [Slot]
    var size: CGFloat = 30

    init(total: Int = 3, used: Int, solved: Bool, size: CGFloat = 30) {
        self.size = size
        slots = (0..<total).map { index in
            if solved && index == used - 1 { return .solved }
            return index < used ? .missed : .open
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            ForEach(Array(slots.enumerated()), id: \.offset) { _, slot in
                tile(slot)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
    }

    private func tile(_ slot: Slot) -> some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
        return ZStack {
            switch slot {
            case .open:
                shape.strokeBorder(Theme.panelLedge, lineWidth: 2.5)
            case .missed:
                shape.fill(Theme.errorFill)
                Image(systemName: "xmark").font(.system(size: size * 0.42, weight: .black)).foregroundStyle(.white)
            case .solved:
                shape.fill(Theme.successFill)
                Image(systemName: "checkmark").font(.system(size: size * 0.42, weight: .black)).foregroundStyle(.white)
            }
        }
        .frame(width: size, height: size)
    }

    private var accessibilityText: String {
        if slots.contains(.solved) { return "Solved" }
        let left = slots.filter { $0 == .open }.count
        return "\(left) of \(slots.count) guesses left"
    }
}

// MARK: - Shared page chrome

struct FieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content.font(Theme.font(17, weight: .medium)).padding(16)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
    }
}
struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(Theme.font(12, weight: .heavy, relativeTo: .caption))
            .tracking(0.8)
            .foregroundStyle(Theme.secondary)
    }
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
                .padding(.horizontal, 20).padding(.vertical, 20).frame(maxWidth: 600).frame(maxWidth: .infinity)
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
    var body: some View { Label(message, systemImage: "info.circle").font(Theme.font(14, weight: .medium)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true).accessibilityElement(children: .combine) }
}
