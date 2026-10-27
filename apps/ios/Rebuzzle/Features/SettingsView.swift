import SwiftUI
import AppIntents
import RebuzzleCore

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("haptics") private var haptics = true
    var body: some View {
        Form {
            Section {
                HStack(spacing: 14) {
                    Image(systemName: "person.crop.circle.fill").font(.system(size: 42)).foregroundStyle(Theme.accent)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.player?.guest == false ? (model.player?.username ?? "Curious mind") : "Hello, curious mind.")
                            .font(Theme.font(20, weight: .medium))
                        Text(model.journeySnapshot?.summary.map { "Level \($0.level) · Your daily aha club" } ?? "Your daily aha club")
                            .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    }
                }.padding(.vertical, 8)
            }
            Section {
                if let player = model.player {
                    LabeledContent("Playing as", value: player.guest ? "Guest" : player.username)
                    if player.guest {
                        NavigationLink("Save this journey with an account") { GuestUpgradeView() }
                        NavigationLink("Sign in to an existing account") { SignInView() }
                    } else {
                        Button("Sign out") { Task { await model.signOut() } }.disabled(model.busy || model.submitting)
                    }
                } else {
                    NavigationLink("Sign in") { SignInView() }
                    Link("Create an account", destination: URL(string: "https://rebuzzle.byronwade.com/signup")!)
                }
                if let message = model.accountError { Text(message).foregroundStyle(Theme.error) }
            } header: { Text("Your account") } footer: {
                Text(model.player?.guest == true
                     ? "Daily puzzles reset according to the time zone saved to this guest profile. Creating an account keeps this Journey under the same identity; journal notes stay on this device."
                     : "Daily puzzles reset using the time zone saved to this account, keeping the puzzle day consistent across devices. Journal notes stay on this device.")
            }
            Section("Make it yours") {
                Picker("Appearance", selection: $appearance) { Text("System").tag("system"); Text("Light").tag("light"); Text("Dark").tag("dark") }
                Toggle("Haptic feedback", isOn: $haptics)
                NavigationLink("Daily reminder") { ReminderView() }
            }
            Section {
                NavigationLink("Rebuzzle Plus") { PlusView() }
                Button("Restore purchases") { Task { await model.purchases.restore() } }.disabled(model.purchases.busy)
                if let message = model.purchases.message { Text(message).font(.footnote).foregroundStyle(Theme.secondary) }
            } header: { Text("A little more Rebuzzle") }
            Section("About") {
                NavigationLink("How to play") { HelpView() }
                Link("Privacy policy", destination: URL(string: "https://rebuzzle.byronwade.com/privacy")!)
                Link("Terms of use", destination: URL(string: "https://rebuzzle.byronwade.com/terms")!)
                Link("Help and feedback", destination: URL(string: "https://rebuzzle.byronwade.com/how-it-works#feedback")!)
                ShareLink(item: "Small puzzle. Big aha. Try today’s Rebuzzle with me: https://rebuzzle.byronwade.com") {
                    Label("Invite a curious friend", systemImage: "square.and.arrow.up")
                }
                LabeledContent("Version", value: "\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"))")
            }
            if model.player != nil {
                Section {
                    NavigationLink { DeleteAccountView() } label: { Text("Delete account").foregroundStyle(Theme.error) }
                } footer: { Text("Permanently removes your account and associated gameplay data. Export your journal first if you want to keep it.") }
            }
        }
        .scrollContentBackground(.hidden).background(Theme.canvas).foregroundStyle(Theme.ink)
        .navigationTitle("You").navigationBarTitleDisplayMode(.inline)
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
                Text("Make it yours.").font(Theme.font(32, weight: .medium))
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
                    HStack { Text("Save my journey"); if model.busy { ProgressView().tint(Theme.canvas) } else { Image(systemName: "arrow.right") } }
                }.buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
            }
            Notice(message: "This converts your guest account in place. Your puzzle history stays with it; private journal notes remain on this device. Signing into another account does not merge progress.")
        }
        .navigationTitle("Create account").navigationBarTitleDisplayMode(.inline)
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
            VStack(alignment: .leading, spacing: 10) { Text("Welcome back.").font(Theme.font(32, weight: .medium)); Text("Your daily practice, wherever you are.").font(Theme.font(16)).foregroundStyle(Theme.secondary) }
            VStack(alignment: .leading, spacing: 12) {
                Text("Email").font(Theme.font(14, weight: .medium))
                TextField("you@example.com", text: $email).textContentType(.username).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled().modifier(FieldStyle())
                Text("Password").font(Theme.font(14, weight: .medium)).padding(.top, 12)
                SecureField("Password", text: $password).textContentType(.password).modifier(FieldStyle())
                if let error = model.accountError { Notice(message: error) }
                Button { Task { if await model.signIn(email: email, password: password) { dismiss() } } } label: {
                    HStack { Text("Sign in"); if model.busy { ProgressView().tint(Theme.canvas) } else { Image(systemName: "arrow.right") } }
                }.buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
                Link("Forgot your password?", destination: URL(string: "https://rebuzzle.byronwade.com/forgot-password")!).font(Theme.font(14)).frame(minHeight: 44)
            }
            Notice(message: "Guest progress and journal entries remain with your guest identity. Signing in switches to your account; it does not merge guest history.")
        }.navigationTitle("Sign in").navigationBarTitleDisplayMode(.inline)
    }
}
struct DeleteAccountView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var password = ""
    @State private var confirmation = false
    var body: some View {
        Page {
            Text("Leave with a clean slate.").font(Theme.font(30, weight: .medium))
            Text("Deleting your account permanently removes its gameplay history and personal account data, including this account’s local journal. This cannot be undone. Your Apple purchase history is managed by Apple.").font(Theme.font(16))
            if !model.journal.entries.isEmpty { ShareLink(item: model.journal.exportText) { Label("Export journal first", systemImage: "square.and.arrow.up") } }
            if model.player?.guest == false {
                VStack(alignment: .leading, spacing: 12) { Text("Confirm your password"); SecureField("Current password", text: $password).textContentType(.password).modifier(FieldStyle()) }
            }
            if let error = model.accountError { Notice(message: error) }
            Button("Delete my account", role: .destructive) { confirmation = true }.buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
        }.navigationTitle("Delete account").navigationBarTitleDisplayMode(.inline)
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
        Form {
            Section {
                Label("Your daily invitation", systemImage: "bell.badge")
                    .font(Theme.font(22, weight: .semibold))
                Text("A small break. A fresh connection. Pick a moment that feels like yours.")
                    .foregroundStyle(Theme.secondary)
                Toggle("Daily reminder", isOn: $enabled)
                DatePicker("Your moment", selection: $time, displayedComponents: .hourAndMinute).disabled(!enabled)
            } footer: { Text("One invitation at your local time. We skip today if you’ve already finished. Never an extra nudge or a streak warning.") }
            Section {
                Button(saving ? "Saving reminder…" : "Save reminder") { Task {
                    saving = true
                    await model.reminders.configure(enabled: enabled, time: time, completedToday: model.completedCurrentPuzzle)
                    enabled = model.reminders.enabled; saving = false
                    if model.reminders.enabled, model.reminders.nextReminder != nil {
                        model.recordGrowthEvent(.reminderEnabled)
                    }
                } }.disabled(saving)
                if let next = model.reminders.nextReminder {
                    LabeledContent("Next invitation", value: next.formatted(date: .abbreviated, time: .shortened))
                }
                if let message = model.reminders.message { Text(message).font(.footnote) }
                if model.reminders.permissionDenied {
                    Text("Notifications are disabled in iOS. Allow them in Settings, then save your reminder.").font(.footnote)
                }
                Link("Open notification settings", destination: URL(string: UIApplication.openNotificationSettingsURLString)!)
            } footer: { Text("iOS asks permission when you save an enabled reminder. Focus and notification settings control delivery. Upcoming reminders refresh for the next 60 days whenever you play.") }
            Section("One tap back to your daily aha") {
                Label("Keep Rebuzzle on your Home Screen", systemImage: "square.grid.2x2")
                Text("Touch and hold your Home Screen, tap Edit → Add Widget, then search for Rebuzzle. The widget shows the next local daily reset and opens Play.").font(.footnote).foregroundStyle(Theme.secondary)
                Label("A little wonder on your Lock Screen", systemImage: "lock")
                Text("Touch and hold your Lock Screen, choose Customize, then add the Rebuzzle widget below the clock.").font(.footnote).foregroundStyle(Theme.secondary)
                SiriTipView(intent: PlayTodayIntent())
                ShortcutsLink()
            }
        }.scrollContentBackground(.hidden).background(Theme.canvas)
            .navigationTitle("A daily moment").navigationBarTitleDisplayMode(.inline)
            .task {
                await model.reminders.refreshAuthorization()
                enabled = model.reminders.enabled
                time = Calendar.current.date(bySettingHour: model.reminders.hour, minute: model.reminders.minute, second: 0, of: Date()) ?? Date()
            }
            .onChange(of: phase) { _, next in
                if next == .active { Task { await model.reminders.refreshAuthorization() } }
            }
    }
}
