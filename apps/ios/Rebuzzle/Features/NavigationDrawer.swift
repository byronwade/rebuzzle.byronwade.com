import SwiftUI

enum RebuzzleRoute: Hashable {
    case daily
    case archive
    case plus
    case journal
}

enum DrawerDestination: Hashable {
    case today
    case journey
    case archive
    case profile
    case plus
    case journal
}

struct ArcadeHomeButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "house.fill")
                .font(.system(size: 19, weight: .medium))
                .foregroundStyle(Theme.ink)
                .frame(width: 44, height: 44)
                .background(Theme.field.opacity(0.72), in: RoundedRectangle(cornerRadius: 14))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Arcade home")
        .accessibilityIdentifier("arcadeHomeButton")
    }
}

struct AppScreenHeader: View {
    let title: String
    let onOpenMenu: () -> Void
    var subtitle: String? = nil
    var trailingTitle: String? = nil
    var trailingSymbol: String? = nil
    var trailingAction: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 10) {
            ArcadeHomeButton(action: onOpenMenu)
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(Theme.font(16, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                if let subtitle {
                    Text(subtitle.uppercased())
                        .font(Theme.font(9, weight: .semibold, relativeTo: .caption))
                        .tracking(0.8)
                        .foregroundStyle(Theme.secondary)
                }
            }
            Spacer(minLength: 8)
            if let trailingTitle, let trailingSymbol, let trailingAction {
                Button(action: trailingAction) {
                    Image(systemName: trailingSymbol)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.accent)
                        .frame(width: 38, height: 38)
                        .background(Theme.field.opacity(0.72), in: RoundedRectangle(cornerRadius: 12))
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(trailingTitle)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 2)
        .padding(.bottom, 7)
        .frame(maxWidth: .infinity)
        .background(Theme.canvas)
    }
}

struct NavigationDrawer: View {
    @Environment(AppModel.self) private var model
    @AccessibilityFocusState private var todayRowFocused: Bool

    let selectedDestination: DrawerDestination?
    let onDismiss: () -> Void
    let onSelect: (DrawerDestination) -> Void

    var body: some View {
        VStack(spacing: 0) {
            header

            ScrollView {
                VStack(alignment: .leading, spacing: 5) {
                    destinationRow(
                        "Today",
                        subtitle: todaySubtitle,
                        symbol: "bubble.left.and.bubble.right",
                        selected: selectedDestination == .today,
                        accessibilityID: "drawerToday"
                    ) { onSelect(.today) }
                    .accessibilityFocused($todayRowFocused)

                    destinationRow(
                        "Journey",
                        symbol: "map",
                        selected: selectedDestination == .journey,
                        accessibilityID: "drawerJourney"
                    ) { onSelect(.journey) }

                    Rectangle()
                        .fill(Theme.secondary.opacity(0.14))
                        .frame(height: 1)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)

                    sectionLabel("PUZZLE LIBRARY")
                    destinationRow(
                        "Past puzzles",
                        symbol: model.purchases.hasPlus ? "calendar" : "lock",
                        selected: selectedDestination == .archive,
                        trailing: model.purchases.hasPlus ? nil : "PLUS",
                        accessibilityID: "drawerArchive"
                    ) { onSelect(.archive) }
                    destinationRow(
                        "Puzzle journal",
                        symbol: model.purchases.hasPlus ? "book.closed" : "lock",
                        selected: selectedDestination == .journal,
                        trailing: model.purchases.hasPlus ? nil : "PLUS",
                        accessibilityID: "drawerJournal"
                    ) { onSelect(.journal) }
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
                .padding(.bottom, 12)
            }
            .scrollIndicators(.hidden)

            VStack(spacing: 8) {
                destinationRow(
                    "Profile & settings",
                    symbol: "person.crop.circle",
                    selected: selectedDestination == .profile,
                    accessibilityID: "drawerProfile"
                ) { onSelect(.profile) }
                .padding(.horizontal, 14)

                plusCard
                    .padding(.horizontal, 14)
            }
            .padding(.top, 8)
            .padding(.bottom, 6)
            .background(Theme.canvas)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.canvas.ignoresSafeArea())
        .overlay(alignment: .trailing) {
            Rectangle().fill(Theme.secondary.opacity(0.20)).frame(width: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .accessibilityIdentifier("navigationDrawer")
        .task {
            await Task.yield()
            todayRowFocused = true
        }
        .onDisappear { todayRowFocused = false }
    }

    private var header: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(Theme.accent, in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 1) {
                Text("Rebuzzle")
                    .font(Theme.display(17, relativeTo: .headline))
                    .foregroundStyle(Theme.ink)
                Text("DAILY PUZZLE CLUB")
                    .font(Theme.font(8, weight: .semibold, relativeTo: .caption))
                    .tracking(1)
                    .foregroundStyle(Theme.secondary)
            }

            Spacer()

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                    .frame(width: 36, height: 36)
                    .background(Theme.field.opacity(0.72), in: RoundedRectangle(cornerRadius: 11))
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close navigation menu")
            .accessibilityIdentifier("closeNavigationDrawer")
        }
        .padding(.horizontal, 18)
        .padding(.top, 3)
        .padding(.bottom, 9)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.secondary.opacity(0.16)).frame(height: 1)
        }
    }

    @ViewBuilder private var plusCard: some View {
        if model.purchases.hasPlus {
            Button { onSelect(.journal) } label: {
                HStack(spacing: 12) {
                    Image(systemName: "book.closed")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Theme.reward)
                        .frame(width: 34, height: 34)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Your puzzle journal").font(Theme.font(13, weight: .semibold))
                        Text("Aha notes & saved moments").font(Theme.font(10)).foregroundStyle(Theme.secondary)
                    }
                    Spacer(minLength: 4)
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                }
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.reward.opacity(0.22), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("drawerPlusCollection")
        } else {
            Button { onSelect(.plus) } label: {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(alignment: .center, spacing: 8) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.reward)
                            .frame(width: 28, height: 28)
                            .background(Theme.reward.opacity(0.12), in: RoundedRectangle(cornerRadius: 9))
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Rebuzzle Plus")
                                .font(Theme.font(13, weight: .semibold))
                                .foregroundStyle(Theme.ink)
                            Text("Past puzzles · journal · insights")
                                .font(Theme.font(9, weight: .medium, relativeTo: .caption))
                                .foregroundStyle(Theme.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 4)
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(oneTimePrice)
                                .font(Theme.font(15, weight: .semibold)).monospacedDigit()
                                .foregroundStyle(Theme.reward)
                            Text("ONE-TIME")
                                .font(Theme.font(8, weight: .bold)).tracking(0.5)
                                .foregroundStyle(Theme.secondary)
                        }
                    }
                    HStack(spacing: 6) {
                        Text("One-time purchase · no subscription")
                        Spacer(minLength: 4)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.accent)
                    }
                    .font(Theme.font(10, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                }
                .padding(11)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.reward.opacity(selectedDestination == .plus ? 0.14 : 0.08), in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.reward.opacity(selectedDestination == .plus ? 0.45 : 0.28), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(selectedDestination == .plus ? .isSelected : [])
            .accessibilityLabel(plusAccessibilityLabel)
            .accessibilityHint("Opens the one-time Rebuzzle Plus offer and its benefits.")
            .accessibilityIdentifier("drawerPlusOffer")
        }
    }

    private var todaySubtitle: String {
        guard let date = model.daily?.puzzleDate else { return "Daily puzzle with Eve" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let parsed = formatter.date(from: date) else { return "Daily puzzle · \(date)" }
        return "Daily puzzle · \(parsed.formatted(.dateTime.month(.abbreviated).day()))"
    }

    private var oneTimePrice: String {
        model.purchases.product?.displayPrice ?? "See price"
    }

    private var plusAccessibilityLabel: String {
        let price: String
        if let displayPrice = model.purchases.product?.displayPrice {
            price = ", \(displayPrice), one time"
        } else {
            price = ", one-time purchase"
        }
        return "Rebuzzle Plus: replay past puzzles, keep a puzzle journal, and see solving insights\(price)"
    }

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(Theme.font(10, weight: .bold)).tracking(0.8)
            .foregroundStyle(Theme.secondary)
            .padding(.horizontal, 12)
            .padding(.top, 2)
            .padding(.bottom, 2)
    }

    private func destinationRow(
        _ title: String,
        subtitle: String? = nil,
        symbol: String,
        selected: Bool,
        trailing: String? = nil,
        accessibilityID: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(selected ? Theme.accent : Theme.secondary)
                    .frame(width: 22)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Theme.font(14, weight: selected ? .semibold : .medium))
                        .foregroundStyle(Theme.ink)
                    if let subtitle {
                        Text(subtitle)
                            .font(Theme.font(10)).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer(minLength: 4)
                if let trailing {
                    Text(trailing)
                        .font(Theme.font(9, weight: .bold)).tracking(0.35)
                        .foregroundStyle(Theme.reward)
                } else if selected {
                    Circle().fill(Theme.accent).frame(width: 7, height: 7)
                        .accessibilityHidden(true)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, subtitle == nil ? 6 : 7)
            .frame(maxWidth: .infinity, minHeight: subtitle == nil ? 44 : 50, alignment: .leading)
            .background(selected ? Theme.accent.opacity(0.085) : .clear, in: RoundedRectangle(cornerRadius: 12))
            .contentShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(subtitle.map { "\(title). \($0)" } ?? title)
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier(accessibilityID)
    }
}
