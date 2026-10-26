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
    static let error = adaptive(light: 0xB32D37, dark: 0xF59A9E)
    static func font(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo: Font.TextStyle = .body) -> Font {
        Font.custom("Inter-Regular", size: size, relativeTo: relativeTo).weight(weight)
    }
    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
        })
    }
}
struct CommitStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(Theme.font(16, weight: .medium))
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(Theme.canvas)
            .background(Theme.ink.opacity(configuration.isPressed ? 0.8 : 1), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.secondary.opacity(0.25), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
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
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) { content }
                .padding(.horizontal, 24).padding(.vertical, 20).frame(maxWidth: 600).frame(maxWidth: .infinity)
        }.scrollDismissesKeyboard(.interactively)
            .background(Theme.canvas).foregroundStyle(Theme.ink)
    }
}
struct Notice: View {
    let message: String
    var body: some View { Label(message, systemImage: "info.circle").font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true).accessibilityElement(children: .combine) }
}
