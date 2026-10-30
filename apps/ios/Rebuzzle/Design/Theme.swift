import SwiftUI

// Prestige: dark-only, sharp, gold reserved for progress, rank, XP and the primary action.
enum Theme {
    static let canvas = hex(0x0B0C0E)
    static let panel = hex(0x131418)
    static let field = hex(0x1B1C21)
    static let hairline = hex(0x26272C)
    static let ink = hex(0xECE7DA)
    static let secondary = hex(0x8C8677)
    static let muted = hex(0x55565C)
    static let gold = hex(0xF5C46A)
    static let goldDeep = hex(0xC9932F)
    static let onGold = hex(0x1A1306)
    static let accent = gold
    static let success = hex(0x7FCB95)
    static let reward = gold
    static let error = hex(0xF07A86)
    static let radius: CGFloat = 4
    static func font(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo: Font.TextStyle = .body) -> Font {
        Font.custom("Inter-Regular", size: size, relativeTo: relativeTo).weight(weight)
    }
    /// Condensed heavy display voice for headlines, numbers and ranks; utility copy stays Inter.
    static func display(_ size: CGFloat) -> Font {
        Font.system(size: size, weight: .heavy).width(.condensed)
    }
    /// Uppercase tracked label voice. Callers pass natural-case text.
    static func label(_ size: CGFloat = 12) -> Font {
        Font.custom("Inter-Regular", size: size, relativeTo: .caption).weight(.semibold)
    }
    private static func hex(_ value: UInt32) -> Color {
        Color(red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255)
    }
}
/// Gold primary action. One per screen.
struct CommitStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(Theme.label(15)).tracking(1.2).textCase(.uppercase)
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(Theme.onGold)
            .background(isEnabled ? Theme.gold.opacity(configuration.isPressed ? 0.85 : 1) : Theme.muted, in: RoundedRectangle(cornerRadius: 2))
            .overlay(alignment: .bottom) {
                Rectangle().fill(Theme.goldDeep).frame(height: configuration.isPressed ? 0 : 3)
            }
            .clipShape(RoundedRectangle(cornerRadius: 2))
            .offset(y: configuration.isPressed ? 2 : 0)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.1), value: configuration.isPressed)
    }
}
/// Quiet outlined action that sits beside the gold primary.
struct SecondaryActionStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(Theme.label(13)).tracking(1).textCase(.uppercase)
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(Theme.ink)
            .background(configuration.isPressed ? Theme.field : Theme.panel, in: RoundedRectangle(cornerRadius: 2))
            .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Theme.hairline, lineWidth: 1))
    }
}
struct FieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content.font(Theme.font(17)).padding(16)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 2))
            .overlay(RoundedRectangle(cornerRadius: 2).strokeBorder(Theme.hairline, lineWidth: 1))
    }
}
struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text).font(Theme.label(12)).tracking(1.2).textCase(.uppercase).foregroundStyle(Theme.secondary)
    }
}
struct Page<Content: View>: View {
    var spacing: CGFloat = 24
    var bottomSafeAreaClearance: CGFloat = 0
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: spacing) { content }
                .padding(.horizontal, 20).padding(.vertical, 16).frame(maxWidth: 600).frame(maxWidth: .infinity)
        }.scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: bottomSafeAreaClearance).accessibilityHidden(true)
            }
            .background(Theme.canvas).foregroundStyle(Theme.ink)
    }
}
struct Notice: View {
    let message: String
    var body: some View { Label(message, systemImage: "info.circle").font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true).accessibilityElement(children: .combine) }
}
