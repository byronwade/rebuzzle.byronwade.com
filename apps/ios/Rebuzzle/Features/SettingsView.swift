import SwiftUI
import AppIntents
import RebuzzleCore

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var phase
    @Environment(\.dynamicTypeSize) private var typeSize
    var onOpenMenu: () -> Void = {}
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("haptics") private var haptics = true
    @AppStorage("soundEffectsEnabled") private var soundEffectsEnabled = true
    @AppStorage("liveRoundEnabled") private var liveRoundEnabled = false
    @State private var liveActivitiesAvailable = true
    @State private var liveActivityMessage: String?
    var body: some View {
        Page(spacing: 22) {
            profileCard
            plusCard
            accountGroup
            preferencesGroup
            SettingsGroup(title: "Purchases") {
                Button { Task { await model.purchases.restore() } } label: {
                    SettingsRowLabel(title: "Restore purchases", symbol: "arrow.clockwise", face: Theme.successFill, ledge: Theme.successLedge, chevron: false)
                }
                .buttonStyle(.plain)
                .disabled(model.purchases.busy)
                if let message = model.purchases.message { SettingsCaption(text: message) }
            }
            aboutGroup
            if model.player != nil {
                SettingsGroup(footer: "Permanently removes your account and associated gameplay data. Export your journal first if you want to keep it.") {
                    NavigationLink { DeleteAccountView() } label: {
                        SettingsRowLabel(title: "Delete account", symbol: "trash.fill", face: Theme.errorFill, ledge: Theme.errorLedge, titleColor: Theme.error)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            AppScreenHeader(title: "Profile", onOpenMenu: onOpenMenu)
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { liveActivitiesAvailable = DailyLiveActivityStore.shared.activitiesAreEnabled }
        .onChange(of: phase) { _, next in
            if next == .active { liveActivitiesAvailable = DailyLiveActivityStore.shared.activitiesAreEnabled }
        }
    }

    private var profileCard: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 14))
        return layout {
            IconTile(systemImage: "person.fill", face: Theme.accentFill, ledge: Theme.accentLedge, size: 58)
            VStack(alignment: .leading, spacing: 6) {
                Text(model.player?.guest == false ? (model.player?.username ?? "Curious mind") : "Hello, curious mind.")
                    .font(Theme.display(22, relativeTo: .title2))
                    .fixedSize(horizontal: false, vertical: true)
                if let summary = model.journeySnapshot?.summary {
                    Pill(text: "Level \(summary.level)", systemImage: "star.fill", tint: Theme.accent)
                }
                Text("Your daily aha club")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            }
            .accessibilityElement(children: .combine)
        }
        .gameCard(padding: 16)
    }

    private var plusCard: some View {
        SettingsGroup(title: "Rebuzzle Plus") {
            NavigationLink { PlusView() } label: {
                HStack(spacing: 13) {
                    if model.purchases.hasPlus {
                        IconTile(systemImage: "checkmark.seal.fill", face: Theme.successFill, ledge: Theme.successLedge, size: 44)
                    } else {
                        IconTile(systemImage: "crown.fill", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 44)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(model.purchases.hasPlus ? "Plus is yours" : "Unlock Rebuzzle Plus")
                            .font(Theme.font(16, weight: .heavy))
                        Text("Past puzzles · journal · solve insights")
                            .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(model.purchases.hasPlus ? "Unlocked" : plusPrice)
                            .font(Theme.font(12, weight: .heavy)).foregroundStyle(model.purchases.hasPlus ? Theme.success : Theme.reward)
                    }
                    Spacer(minLength: 4)
                    SettingsChevron()
                }
                .foregroundStyle(Theme.ink)
                .frame(minHeight: 52)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("openPlusFromProfile")
        }
    }

    private var accountGroup: some View {
        SettingsGroup(
            title: "Your account",
            footer: model.player?.guest == true
                ? "Daily puzzles reset according to the time zone saved to this guest profile. Creating an account keeps this Journey under the same identity; journal notes stay on this device."
                : "Daily puzzles reset using the time zone saved to this account, keeping the puzzle day consistent across devices. Journal notes stay on this device."
        ) {
            if let player = model.player {
                SettingsRowLabel(title: "Playing as", symbol: "gamecontroller.fill", face: Theme.accentFill, ledge: Theme.accentLedge, value: player.guest ? "Guest" : player.username, chevron: false)
                    .accessibilityElement(children: .combine)
                if player.guest {
                    NavigationLink("Save this journey with an account") { GuestUpgradeView() }
                        .buttonStyle(ChunkyButtonStyle(variant: .primary))
                        .padding(.top, 4)
                    NavigationLink("Sign in to an existing account") { SignInView() }
                        .buttonStyle(ChunkyButtonStyle(variant: .secondary))
                } else {
                    Button("Sign out") { Task { await model.signOut() } }
                        .buttonStyle(ChunkyButtonStyle(variant: .secondary))
                        .disabled(model.busy || model.submitting)
                        .padding(.top, 4)
                }
            } else {
                NavigationLink("Sign in") { SignInView() }
                    .buttonStyle(ChunkyButtonStyle(variant: .primary))
                Link("Create an account", destination: URL(string: "https://rebuzzle.byronwade.com/signup")!)
                    .buttonStyle(ChunkyButtonStyle(variant: .secondary))
            }
            if let message = model.accountError {
                Text(message).font(Theme.font(13, weight: .semibold)).foregroundStyle(Theme.error)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var preferencesGroup: some View {
        SettingsGroup(title: "Make it yours") {
            HStack(spacing: 13) {
                IconTile(systemImage: "circle.lefthalf.filled", face: Theme.eveFill, ledge: Theme.eveLedge, size: 38)
                Text("Appearance").font(Theme.font(16, weight: .semibold))
                Spacer(minLength: 8)
                Picker("Appearance", selection: $appearance) { Text("System").tag("system"); Text("Light").tag("light"); Text("Dark").tag("dark") }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .font(Theme.font(15, weight: .semibold))
            }
            .frame(minHeight: 44)
            SettingsDivider()
            Toggle(isOn: $haptics) {
                SettingsRowTitle(title: "Haptic feedback", symbol: "iphone.radiowaves.left.and.right", face: Theme.accentFill, ledge: Theme.accentLedge)
            }
            .frame(minHeight: 44)
            SettingsDivider()
            Toggle(isOn: $soundEffectsEnabled) {
                SettingsRowTitle(title: "Sound effects", symbol: "speaker.wave.2.fill", face: Theme.successFill, ledge: Theme.successLedge)
            }
            .frame(minHeight: 44)
            .accessibilityHint("Play soft game sounds for hints, close guesses, and celebrations.")
            .onChange(of: soundEffectsEnabled) { _, enabled in
                if !enabled { GameSoundPlayer.shared.stop() }
            }
            SettingsCaption(text: "Soft game cues follow iPhone Silent mode and mix with other audio.")
            SettingsDivider()
            Toggle(isOn: $liveRoundEnabled) {
                SettingsRowTitle(title: "Live round on Lock Screen", symbol: "lock.iphone", face: Theme.gold, ledge: Theme.goldLedge, glyph: Theme.onGold)
            }
            .frame(minHeight: 44)
            .onChange(of: liveRoundEnabled) { _, enabled in
                liveActivityMessage = nil
                Task {
                    let accepted = await model.setLiveRoundEnabled(enabled)
                    liveActivitiesAvailable = DailyLiveActivityStore.shared.activitiesAreEnabled
                    if !accepted {
                        liveRoundEnabled = false
                        liveActivityMessage = "Live Activities are off for Rebuzzle in iPhone Settings. Turn them on there, then try again."
                    }
                }
            }
            SettingsCaption(text: "See guesses left and the next puzzle countdown. Your answer and guesses never appear.")
            if let liveActivityMessage {
                SettingsCaption(text: liveActivityMessage)
            } else if liveRoundEnabled && !liveActivitiesAvailable {
                SettingsCaption(text: "Live Activities are off for Rebuzzle in iPhone Settings.")
            }
            if (liveActivityMessage != nil) || (liveRoundEnabled && !liveActivitiesAvailable) {
                Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                    SettingsRowLabel(title: "Open iPhone settings", symbol: "gearshape.fill", face: Theme.accentFill, ledge: Theme.accentLedge, external: true)
                }
                .buttonStyle(.plain)
            }
            SettingsDivider()
            NavigationLink { ReminderView() } label: {
                SettingsRowLabel(title: "Daily reminder", symbol: "bell.badge.fill", face: Theme.errorFill, ledge: Theme.errorLedge)
            }
            .buttonStyle(.plain)
        }
    }

    private var aboutGroup: some View {
        SettingsGroup(title: "About") {
            NavigationLink { HelpView() } label: {
                SettingsRowLabel(title: "How to play", symbol: "questionmark", face: Theme.accentFill, ledge: Theme.accentLedge)
            }
            .buttonStyle(.plain)
            SettingsDivider()
            Link(destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!) {
                SettingsRowLabel(title: "Privacy policy", symbol: "hand.raised.fill", face: Theme.successFill, ledge: Theme.successLedge, external: true)
            }
            .buttonStyle(.plain)
            SettingsDivider()
            Link(destination: URL(string: "https://rebuzzle.byronwade.com/terms")!) {
                SettingsRowLabel(title: "Terms of use", symbol: "doc.text.fill", face: Theme.eveFill, ledge: Theme.eveLedge, external: true)
            }
            .buttonStyle(.plain)
            SettingsDivider()
            Link(destination: URL(string: "https://rebuzzle.byronwade.com/how-it-works#feedback")!) {
                SettingsRowLabel(title: "Help and feedback", symbol: "bubble.left.fill", face: Theme.accentFill, ledge: Theme.accentLedge, external: true)
            }
            .buttonStyle(.plain)
            SettingsDivider()
            ShareLink(item: "Small puzzle. Big aha. Try today’s Rebuzzle with me: https://rebuzzle.byronwade.com") {
                SettingsRowLabel(title: "Invite a curious friend", symbol: "square.and.arrow.up", face: Theme.gold, ledge: Theme.goldLedge, glyph: Theme.onGold, chevron: false)
            }
            .buttonStyle(.plain)
            SettingsDivider()
            SettingsRowLabel(title: "Version", symbol: "info", face: Theme.secondary, ledge: Theme.ink.opacity(0.6), value: versionText, chevron: false)
                .accessibilityElement(children: .combine)
        }
    }

    private var versionText: String {
        "\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"))"
    }

    private var plusPrice: String {
        guard let price = model.purchases.product?.displayPrice else { return "one-time purchase" }
        return "one-time · \(price)"
    }
}

// MARK: - Grouped game-card rows

/// A titled white game card that stacks settings rows.
private struct SettingsGroup<Content: View>: View {
    var title: String?
    var footer: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title { Eyebrow(text: title).padding(.leading, 4) }
            VStack(alignment: .leading, spacing: 10) { content }
                .gameCard(padding: 14)
            if let footer {
                Text(footer)
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)
            }
        }
    }
}

/// An icon tile and title, used as a Toggle label so the switch keeps its plain-text name.
private struct SettingsRowTitle: View {
    let title: String
    let symbol: String
    var face: Color
    var ledge: Color
    var glyph: Color = .white
    var titleColor: Color = Theme.ink

    var body: some View {
        HStack(spacing: 13) {
            IconTile(systemImage: symbol, face: face, ledge: ledge, symbol: glyph, size: 38)
            Text(title).font(Theme.font(16, weight: .semibold)).foregroundStyle(titleColor)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// A tappable settings row: icon tile, title, optional value and a trailing chevron or arrow.
private struct SettingsRowLabel: View {
    let title: String
    let symbol: String
    var face: Color
    var ledge: Color
    var glyph: Color = .white
    var titleColor: Color = Theme.ink
    var value: String?
    var chevron = true
    var external = false
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 13) {
                SettingsRowTitle(title: title, symbol: symbol, face: face, ledge: ledge, glyph: glyph, titleColor: titleColor)
                Spacer(minLength: 8)
                if let value, !typeSize.isAccessibilitySize { valueText(value) }
                if external {
                    Image(systemName: "arrow.up.right").font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.secondary)
                        .accessibilityHidden(true)
                } else if chevron {
                    SettingsChevron()
                }
            }
            if let value, typeSize.isAccessibilitySize { valueText(value) }
        }
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
    }

    private func valueText(_ value: String) -> some View {
        Text(value).font(Theme.font(15, weight: .semibold)).foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }
}

private struct SettingsChevron: View {
    var body: some View {
        Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.secondary)
            .accessibilityHidden(true)
    }
}

private struct SettingsDivider: View {
    var body: some View {
        Capsule().fill(Theme.panelLedge.opacity(0.7)).frame(height: 2).accessibilityHidden(true)
    }
}

private struct SettingsCaption: View {
    let text: String
    var body: some View {
        Text(text).font(Theme.font(12)).foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }
}

struct GuestUpgradeView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""

    private enum Field { case username, email, password }

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow(text: "KEEP YOUR JOURNEY")
                Text("Make it yours.").font(Theme.display(32))
                Text("Your account will keep the progress you’ve already made, so you can bring this same daily practice to another device.")
                    .font(Theme.font(16)).foregroundStyle(Theme.secondary)
            }
            VStack(alignment: .leading, spacing: 12) {
                Text("Username").font(Theme.font(14, weight: .medium))
                TextField("Choose a username", text: $username)
                    .textContentType(.nickname).textInputAutocapitalization(.words).autocorrectionDisabled()
                    .focused($focusedField, equals: .username).submitLabel(.next)
                    .onSubmit { focusedField = .email }.modifier(FieldStyle())
                Text("Email").font(Theme.font(14, weight: .medium)).padding(.top, 8)
                TextField("you@example.com", text: $email)
                    .textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .focused($focusedField, equals: .email).submitLabel(.next)
                    .onSubmit { focusedField = .password }.modifier(FieldStyle())
                Text("Password").font(Theme.font(14, weight: .medium)).padding(.top, 8)
                SecureField("At least 6 characters", text: $password)
                    .textContentType(.newPassword).focused($focusedField, equals: .password).submitLabel(.done)
                    .onSubmit { focusedField = nil }.modifier(FieldStyle())
                if let error = model.accountError { Notice(message: error) }
                Button {
                    Task {
                        focusedField = nil
                        if await model.upgradeGuestAccount(username: username, email: email, password: password) { dismiss() }
                    }
                } label: {
                    HStack { Text("Save my journey"); if model.busy { ProgressView().tint(.white) } else { Image(systemName: "arrow.right") } }
                }.buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
            }
            Notice(message: "This converts your guest account in place. Your puzzle history stays with it; private journal notes remain on this device. Signing into another account does not merge progress.")
        }
        .navigationTitle("Create account").navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focusedField = nil }
            }
        }
    }
}
struct SignInView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 10) { Text("Welcome back.").font(Theme.display(32)); Text("Your daily practice, wherever you are.").font(Theme.font(16)).foregroundStyle(Theme.secondary) }
            VStack(alignment: .leading, spacing: 12) {
                Text("Email").font(Theme.font(14, weight: .medium))
                TextField("you@example.com", text: $email).textContentType(.username).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled().modifier(FieldStyle())
                Text("Password").font(Theme.font(14, weight: .medium)).padding(.top, 12)
                SecureField("Password", text: $password).textContentType(.password).modifier(FieldStyle())
                if let error = model.accountError { Notice(message: error) }
                Button { Task { if await model.signIn(email: email, password: password) { dismiss() } } } label: {
                    HStack { Text("Sign in"); if model.busy { ProgressView().tint(.white) } else { Image(systemName: "arrow.right") } }
                }.buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
                Link("Forgot your password?", destination: URL(string: "https://rebuzzle.byronwade.com/forgot-password")!).font(Theme.font(14)).frame(minHeight: 44)
            }
            Notice(message: "Guest progress and journal entries remain with your guest identity. Signing in switches to your account; it does not merge guest history.")
        }
        .navigationTitle("Sign in")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
    }
}
struct DeleteAccountView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var password = ""
    @State private var confirmation = false
    var body: some View {
        Page {
            Text("Leave with a clean slate.").font(Theme.display(30)).fixedSize(horizontal: false, vertical: true)
            Text("Deleting your account permanently removes its gameplay history and personal account data, including this account’s local journal. This cannot be undone. Your Apple purchase history is managed by Apple.").font(Theme.font(16)).fixedSize(horizontal: false, vertical: true)
            if !model.journal.entries.isEmpty { ShareLink(item: model.journal.exportText) { Label("Export journal first", systemImage: "square.and.arrow.up") }.buttonStyle(ChunkyButtonStyle(variant: .secondary)) }
            if model.player?.guest == false {
                VStack(alignment: .leading, spacing: 12) { Text("Confirm your password").font(Theme.font(14, weight: .semibold)); SecureField("Current password", text: $password).textContentType(.password).modifier(FieldStyle()) }
            }
            if let error = model.accountError { Notice(message: error) }
            Button("Delete my account", role: .destructive) { confirmation = true }.buttonStyle(ChunkyButtonStyle(variant: .destructive)).disabled(model.busy || model.submitting)
        }
        .navigationTitle("Delete account")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
            .alert("Permanently delete your account?", isPresented: $confirmation) {
                Button("Keep account", role: .cancel) {}
                Button("Delete account", role: .destructive) { Task { if await model.deleteAccount(password: password) { dismiss() } } }
            } message: { Text("Your account, progress, and local journal will be removed. This cannot be undone.") }
    }
}
struct ReminderView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var phase
    @State private var time = Date()
    @State private var enabled = false
    @State private var saving = false
    var body: some View {
        Page(spacing: 20) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 13) {
                    IconTile(systemImage: "bell.badge.fill", face: Theme.errorFill, ledge: Theme.errorLedge, size: 48)
                    Text("Your daily invitation")
                        .font(Theme.display(22, relativeTo: .title2))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text("A small break. A fresh connection. Pick a moment that feels like yours.")
                    .font(Theme.font(15)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Toggle("Daily reminder", isOn: $enabled)
                    .font(Theme.font(16, weight: .semibold))
                    .frame(minHeight: 44)
                DatePicker("Your moment", selection: $time, displayedComponents: .hourAndMinute).disabled(!enabled)
                    .font(Theme.font(16, weight: .semibold))
                    .frame(minHeight: 44)
                reminderCaption("One invitation at your local time. We skip today if you’ve already finished. Never an extra nudge or a streak warning.")
            }
            .gameCard(padding: 18)
            VStack(alignment: .leading, spacing: 12) {
                Button { Task {
                    saving = true
                    await model.reminders.configure(enabled: enabled, time: time, completedToday: model.completedCurrentPuzzle)
                    enabled = model.reminders.enabled; saving = false
                    if model.reminders.enabled, model.reminders.nextReminder != nil {
                        model.recordGrowthEvent(.reminderEnabled)
                    }
                } } label: {
                    Text(saving ? "Saving reminder…" : "Save reminder")
                }
                .buttonStyle(ChunkyButtonStyle(variant: .primary))
                .disabled(saving)
                if let next = model.reminders.nextReminder {
                    ViewThatFits(in: .horizontal) {
                        HStack {
                            Text("Next invitation").font(Theme.font(15, weight: .semibold))
                            Spacer(minLength: 8)
                            Text(next.formatted(date: .abbreviated, time: .shortened)).font(Theme.font(15, weight: .semibold)).foregroundStyle(Theme.secondary)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Next invitation").font(Theme.font(15, weight: .semibold))
                            Text(next.formatted(date: .abbreviated, time: .shortened)).font(Theme.font(15, weight: .semibold)).foregroundStyle(Theme.secondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                }
                if let message = model.reminders.message { reminderCaption(message) }
                if model.reminders.permissionDenied {
                    reminderCaption("Notifications are disabled in iOS. Allow them in Settings, then save your reminder.")
                }
                Link("Open notification settings", destination: URL(string: UIApplication.openNotificationSettingsURLString)!)
                    .buttonStyle(ChunkyButtonStyle(variant: .secondary, compact: true))
                reminderCaption("iOS asks permission when you save an enabled reminder. Focus and notification settings control delivery. Upcoming reminders refresh for the next 60 days whenever you play.")
            }
            .gameCard(padding: 18)
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: "One tap back to your daily aha")
                HStack(spacing: 12) {
                    IconTile(systemImage: "square.grid.2x2.fill", face: Theme.accentFill, ledge: Theme.accentLedge, size: 38)
                    Text("Keep Rebuzzle on your Home Screen").font(Theme.font(16, weight: .heavy)).fixedSize(horizontal: false, vertical: true)
                }
                reminderCaption("Touch and hold your Home Screen, tap Edit → Add Widget, then search for Rebuzzle. The widget shows the next local daily reset and opens Play.")
                HStack(spacing: 12) {
                    IconTile(systemImage: "lock.fill", face: Theme.eveFill, ledge: Theme.eveLedge, size: 38)
                    Text("A little wonder on your Lock Screen").font(Theme.font(16, weight: .heavy)).fixedSize(horizontal: false, vertical: true)
                }
                reminderCaption("Touch and hold your Lock Screen, choose Customize, then add the Rebuzzle widget below the clock.")
                SiriTipView(intent: PlayTodayIntent())
                ShortcutsLink()
            }
            .gameCard(padding: 18)
        }
            .navigationTitle("A daily moment").navigationBarTitleDisplayMode(.inline)
            .toolbar(.visible, for: .navigationBar)
            .task {
                await model.reminders.refreshAuthorization()
                enabled = model.reminders.enabled
                time = Calendar.current.date(bySettingHour: model.reminders.hour, minute: model.reminders.minute, second: 0, of: Date()) ?? Date()
            }
            .onChange(of: phase) { _, next in
                if next == .active { Task { await model.reminders.refreshAuthorization() } }
            }
    }

    private func reminderCaption(_ text: String) -> some View {
        Text(text).font(Theme.font(13)).foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }
}
