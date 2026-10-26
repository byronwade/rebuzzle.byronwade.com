import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("haptics") private var haptics = true
    var body: some View {
        Form {
            Section {
                if let player = model.player {
                    LabeledContent("Playing as", value: player.guest ? "Guest" : player.username)
                    if player.guest { NavigationLink("Sign in to your account") { SignInView() } }
                    else { Button("Sign out") { Task { await model.signOut() } }.disabled(model.busy || model.submitting) }
                } else { NavigationLink("Sign in") { SignInView() } }
                Link("Create an account", destination: URL(string: "https://rebuzzle.byronwade.com/signup")!)
                if let message = model.accountError { Text(message).foregroundStyle(Theme.error) }
            } header: { Text("Your account") } footer: { Text("An account keeps your gameplay statistics with you. Journal entries and notes stay on this device.") }
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
                Link("Help and feedback", destination: URL(string: "https://rebuzzle.byronwade.com/feedback")!)
                LabeledContent("Version", value: "1.0 (1)")
            }
            if model.player != nil {
                Section {
                    NavigationLink { DeleteAccountView() } label: { Text("Delete account").foregroundStyle(Theme.error) }
                } footer: { Text("Permanently removes your account and associated gameplay data. Export your journal first if you want to keep it.") }
            }
        }
        .scrollContentBackground(.hidden).background(Theme.canvas).foregroundStyle(Theme.ink)
        .navigationTitle("Settings").navigationBarTitleDisplayMode(.inline)
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
    @State private var time = Date()
    @State private var enabled = false
    @State private var saving = false
    var body: some View {
        Form {
            Section {
                Toggle("Daily reminder", isOn: $enabled)
                DatePicker("Your moment", selection: $time, displayedComponents: .hourAndMinute).disabled(!enabled)
            } footer: { Text("One gentle invitation, at your local time. You can turn it off anytime. iOS will ask permission when you save an enabled reminder.") }
            Section {
                Button(saving ? "Saving reminder…" : "Save reminder") { Task {
                    saving = true
                    await model.reminders.configure(enabled: enabled, time: time, completedToday: model.game?.gameOver == true)
                    enabled = model.reminders.enabled; saving = false
                } }.disabled(saving)
                if let message = model.reminders.message { Text(message).font(.footnote) }
                Link("Open iOS Settings", destination: URL(string: UIApplication.openSettingsURLString)!)
            }
        }.scrollContentBackground(.hidden).background(Theme.canvas)
            .navigationTitle("A daily moment").navigationBarTitleDisplayMode(.inline)
            .onAppear {
                enabled = model.reminders.enabled
                time = Calendar.current.date(bySettingHour: model.reminders.hour, minute: model.reminders.minute, second: 0, of: Date()) ?? Date()
            }
    }
}
