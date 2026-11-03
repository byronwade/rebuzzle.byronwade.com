import Foundation
import RebuzzleCore
import SwiftUI

struct PuzzleNotebook: Codable, Equatable, Sendable {
    var pins: [PuzzlePin]

    init(pins: [PuzzlePin] = []) {
        self.pins = pins
    }

    static func storageKey(accountID: String, puzzleID: String) -> String {
        "puzzle-notebook:\(accountID):\(puzzleID)"
    }

    var orderedPins: [PuzzlePin] {
        pins.sorted {
            if $0.createdAt == $1.createdAt {
                return $0.id.uuidString < $1.id.uuidString
            }
            return $0.createdAt < $1.createdAt
        }
    }

    func numberedPins(for profileID: String) -> [NumberedPuzzlePin] {
        orderedPins.enumerated().compactMap { offset, pin in
            guard pin.profileID == profileID else { return nil }
            return NumberedPuzzlePin(pin: pin, number: offset + 1)
        }
    }
}

struct PuzzlePin: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let profileID: String
    let point: CanonicalBoardPinPoint
    var hypothesis: String
    let createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        profileID: String,
        point: CanonicalBoardPinPoint,
        hypothesis: String,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.profileID = profileID
        self.point = point
        self.hypothesis = hypothesis
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct NumberedPuzzlePin: Equatable, Identifiable, Sendable {
    let pin: PuzzlePin
    let number: Int

    var id: UUID { pin.id }
}

private struct PuzzleBoardImageMetrics {
    let profileID: String
    let width: Double
    let height: Double
}

struct PuzzleNotebookStudyContent: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let puzzle: Puzzle

    @State private var notebook = PuzzleNotebook()
    @State private var boardSize = CGSize.zero
    @State private var isPlacingPin = false
    @State private var editingPin: PuzzlePin?
    @State private var editingPinIsNew = false
    @State private var editingAccountID: String?
    @State private var notebookAccountID: String?
    @State private var storageAvailable = false
    @State private var storageError: String?
    @State private var pinPlacementCount = 0

    private var displayedProfileID: String? {
        imageMetrics(in: boardSize)?.profileID
    }

    private var sortedPins: [PuzzlePin] {
        notebook.orderedPins
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            boardWithPins
            pinAction
            if isPlacingPin { placementInstructions }
            notebookHeading
            notebookIdeas
            storageNotice
            privacyNote
        }
        .onAppear(perform: loadNotebook)
        .onChange(of: model.player?.id) { _, _ in loadNotebook() }
        .onChange(of: puzzle.id) { _, _ in loadNotebook() }
        .sensoryFeedback(.impact(weight: .light), trigger: pinPlacementCount)
        .sheet(item: $editingPin, onDismiss: {
            editingPinIsNew = false
            editingAccountID = nil
        }) { pin in
            PuzzlePinEditor(
                pin: pin,
                isNew: editingPinIsNew,
                onSave: savePin,
                onDelete: deletePin
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.panel)
        }
    }

    private var pinAction: some View {
        Button {
            isPlacingPin = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.accent)
                    .frame(width: 42, height: 42)
                    .background(Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 13))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Pin an idea")
                        .font(Theme.font(15, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    Text("Save a private hunch on the board")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.secondary)
                }
                Spacer(minLength: 4)
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(Theme.accent)
            }
            .padding(12)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Theme.accent.opacity(0.20), lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .disabled(!storageAvailable)
        .accessibilityIdentifier("pinPuzzleThought")
    }

    private var placementInstructions: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Tap the part you want to remember.", systemImage: "hand.tap")
                .font(Theme.font(14, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("Your note stays on this device. It never uses a guess or gets sent to Eve.")
                .font(Theme.font(12))
                .foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 10) {
                Button {
                    pinAtCenter()
                } label: {
                    Label("Pin at center", systemImage: "scope")
                        .font(Theme.font(13, weight: .semibold))
                        .frame(minHeight: 44)
                        .padding(.horizontal, 12)
                }
                .buttonStyle(.bordered)
                .tint(Theme.accent)
                .disabled(displayedProfileID == nil)
                .accessibilityIdentifier("pinPuzzleThoughtAtCenter")

                Button("Cancel") { isPlacingPin = false }
                    .font(Theme.font(14, weight: .semibold))
                    .foregroundStyle(Theme.secondary)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("cancelPuzzleThoughtPin")
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.accent.opacity(0.07), in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Theme.accent.opacity(0.18), lineWidth: 1))
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .top)))
    }

    private var notebookHeading: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("MY THINKING")
                .font(Theme.font(11, weight: .bold))
                .tracking(1.1)
                .foregroundStyle(Theme.secondary)
            Spacer()
            Text("\(notebook.pins.count) \(notebook.pins.count == 1 ? "idea" : "ideas")")
                .font(Theme.font(12, weight: .semibold))
                .foregroundStyle(Theme.secondary)
                .monospacedDigit()
                .accessibilityIdentifier("puzzleNotebookCount")
        }
    }

    @ViewBuilder private var notebookIdeas: some View {
        if notebook.pins.isEmpty {
            Text("No ideas pinned yet. Mark a detail, word, or pattern you want to come back to.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 2)
                .accessibilityIdentifier("puzzleNotebookEmptyState")
        } else {
            VStack(spacing: 8) {
                ForEach(Array(sortedPins.enumerated()), id: \.element.id) { item in
                    pinRow(item.element, number: item.offset + 1)
                }
            }
        }
    }

    @ViewBuilder private var storageNotice: some View {
        if let storageError {
            Label(storageError, systemImage: "exclamationmark.triangle")
                .font(Theme.font(12))
                .foregroundStyle(Theme.error)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("puzzleNotebookStorageError")
        }
    }

    private var privacyNote: some View {
        Text("A quiet place to work it out. Your notes never change your score.")
            .font(Theme.font(12))
            .foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var boardWithPins: some View {
        PuzzleBoard(puzzle: puzzle)
            .overlay {
                GeometryReader { geometry in
                    pinOverlay(in: geometry.size)
                }
            }
            .onGeometryChange(for: CGSize.self) { $0.size } action: { boardSize = $0 }
            .padding(16)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(
                        isPlacingPin ? Theme.accent.opacity(0.55) : Theme.secondary.opacity(0.20),
                        lineWidth: isPlacingPin ? 2 : 1
                    )
            }
            .accessibilityIdentifier("studyPuzzleBoardWithPins")
    }

    private func pinOverlay(in size: CGSize) -> AnyView {
        let metrics = imageMetrics(in: size)
        let imageRect: CanonicalBoardPinRect?
        if let metrics {
            imageRect = self.imageRect(for: metrics, in: size)
        } else {
            imageRect = nil
        }
        let placementView: AnyView
        if isPlacingPin, let metrics {
            placementView = AnyView(PuzzlePinPlacementTapArea(size: size, metrics: metrics, onPlace: beginEditingPinAtPoint))
        } else {
            placementView = AnyView(EmptyView())
        }
        let markerView: AnyView
        if let metrics, let imageRect {
            markerView = AnyView(
                PuzzlePinMarkerLayer(
                    pins: notebook.numberedPins(for: metrics.profileID),
                    imageRect: imageRect,
                    onEdit: editPin
                )
            )
        } else {
            markerView = AnyView(EmptyView())
        }
        return AnyView(
            ZStack { placementView; markerView }
                .frame(width: size.width, height: size.height)
        )
    }

    private func imageRect(for metrics: PuzzleBoardImageMetrics, in size: CGSize) -> CanonicalBoardPinRect? {
        CanonicalBoardPinGeometry.aspectFitRect(
            containerWidth: Double(size.width),
            containerHeight: Double(size.height),
            imageWidth: metrics.width,
            imageHeight: metrics.height
        )
    }

    @ViewBuilder
    private func pinRow(_ pin: PuzzlePin, number: Int) -> some View {
        let isOnDisplayedLayout = pin.profileID == displayedProfileID
        Button {
            editPin(pin)
        } label: {
            HStack(alignment: .top, spacing: 11) {
                Text("\(number)")
                    .font(Theme.font(13, weight: .bold, relativeTo: .caption))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Theme.accent, in: Circle())
                VStack(alignment: .leading, spacing: 5) {
                    Text(pin.hypothesis)
                        .font(Theme.font(14, weight: .medium))
                        .foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    if !isOnDisplayedLayout {
                        Label("Saved on another board layout", systemImage: "rectangle.on.rectangle")
                            .font(Theme.font(11))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.secondary)
                    .padding(.top, 6)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.field.opacity(0.65), in: RoundedRectangle(cornerRadius: 15))
            .contentShape(RoundedRectangle(cornerRadius: 15))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("puzzleNotebookPin-\(pin.id.uuidString)")
    }

    private func imageMetrics(in size: CGSize) -> PuzzleBoardImageMetrics? {
        guard size.width.isFinite, size.height.isFinite, size.width > 0, size.height > 0 else { return nil }
        if let canonical = puzzle.visual?.canonicalBoard {
            guard let raster = canonical.raster(forBoardWidth: Double(size.width)) else { return nil }
            return PuzzleBoardImageMetrics(profileID: raster.profileID, width: Double(raster.width), height: Double(raster.height))
        }
        return PuzzleBoardImageMetrics(
            profileID: "layout-\(puzzle.visual?.layout ?? "text")",
            width: Double(size.width),
            height: Double(size.height)
        )
    }

    private func beginEditingPinAtPoint(profileID: String, point: CanonicalBoardPinPoint) {
        beginEditingPin(PuzzlePin(profileID: profileID, point: point, hypothesis: ""), isNew: true)
    }

    private func pinAtCenter() {
        guard let profileID = displayedProfileID,
              let point = CanonicalBoardPinPoint(x: 0.5, y: 0.5) else { return }
        beginEditingPin(PuzzlePin(profileID: profileID, point: point, hypothesis: ""), isNew: true)
    }

    private func beginEditingPin(_ pin: PuzzlePin, isNew: Bool) {
        guard let accountID = model.player?.id,
              accountID == notebookAccountID,
              storageAvailable else { return }
        withAnimation(reduceMotion ? nil : .spring(duration: 0.28, bounce: 0.18)) {
            isPlacingPin = false
            editingPinIsNew = isNew
            editingAccountID = accountID
            editingPin = pin
            if isNew { pinPlacementCount += 1 }
        }
    }

    private func editPin(_ pin: PuzzlePin) {
        guard let accountID = model.player?.id,
              accountID == notebookAccountID,
              storageAvailable else { return }
        editingPinIsNew = false
        editingAccountID = accountID
        editingPin = pin
    }

    private func loadNotebook() {
        notebook = PuzzleNotebook()
        isPlacingPin = false
        editingPin = nil
        editingPinIsNew = false
        editingAccountID = nil
        notebookAccountID = nil
        guard let accountID = model.player?.id else {
            storageAvailable = false
            storageError = nil
            return
        }
        notebookAccountID = accountID
        let key = PuzzleNotebook.storageKey(accountID: accountID, puzzleID: puzzle.id)
        do {
            notebook = try model.storage.load(PuzzleNotebook.self, key: key) ?? PuzzleNotebook()
            storageAvailable = true
            storageError = nil
        } catch {
            storageAvailable = false
            storageError = "Your saved ideas could not be opened. They have not been replaced."
        }
    }

    private func savePin(_ pin: PuzzlePin, hypothesis: String) -> Bool {
        let bounded = String(hypothesis.trimmingCharacters(in: .whitespacesAndNewlines).prefix(280))
        guard !bounded.isEmpty,
              let accountID = model.player?.id,
              editingAccountID == accountID,
              notebookAccountID == accountID,
              storageAvailable else { return false }

        var updatedPin = pin
        updatedPin.hypothesis = bounded
        updatedPin.updatedAt = Date()
        var updatedNotebook = notebook
        if let index = updatedNotebook.pins.firstIndex(where: { $0.id == pin.id }) {
            updatedNotebook.pins[index] = updatedPin
        } else {
            updatedNotebook.pins.append(updatedPin)
        }
        updatedNotebook.pins.sort { $0.createdAt < $1.createdAt }
        return persist(updatedNotebook, accountID: accountID)
    }

    private func deletePin(_ pin: PuzzlePin) -> Bool {
        guard let accountID = model.player?.id,
              editingAccountID == accountID,
              notebookAccountID == accountID,
              storageAvailable else { return false }
        var updatedNotebook = notebook
        updatedNotebook.pins.removeAll { $0.id == pin.id }
        return persist(updatedNotebook, accountID: accountID)
    }

    private func persist(_ updatedNotebook: PuzzleNotebook, accountID: String) -> Bool {
        guard model.player?.id == accountID,
              notebookAccountID == accountID,
              editingAccountID == accountID else { return false }
        do {
            try model.storage.save(
                updatedNotebook,
                key: PuzzleNotebook.storageKey(accountID: accountID, puzzleID: puzzle.id)
            )
            notebook = updatedNotebook
            storageError = nil
            return true
        } catch {
            storageError = "Your idea could not be saved on this device. Try again."
            return false
        }
    }
}

private struct PuzzlePinPlacementTapArea: View {
    let size: CGSize
    let metrics: PuzzleBoardImageMetrics
    let onPlace: (String, CanonicalBoardPinPoint) -> Void

    var body: some View {
        Color.clear
            .contentShape(Rectangle())
            .frame(width: size.width, height: size.height)
            .onTapGesture(coordinateSpace: .local) { location in
                guard let point = CanonicalBoardPinGeometry.normalizedPoint(
                    tapX: Double(location.x),
                    tapY: Double(location.y),
                    containerWidth: Double(size.width),
                    containerHeight: Double(size.height),
                    imageWidth: metrics.width,
                    imageHeight: metrics.height
                ) else { return }
                onPlace(metrics.profileID, point)
            }
            .accessibilityHidden(true)
    }
}

private struct PuzzlePinMarkerLayer: View {
    let pins: [NumberedPuzzlePin]
    let imageRect: CanonicalBoardPinRect
    let onEdit: (PuzzlePin) -> Void

    var body: some View {
        ZStack {
            ForEach(pins) { item in
                marker(item.pin, number: item.number)
            }
        }
    }

    private func marker(_ pin: PuzzlePin, number: Int) -> some View {
        Button {
            onEdit(pin)
        } label: {
            Text("\(number)")
                .font(Theme.font(14, weight: .bold, relativeTo: .caption))
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(Theme.accent, in: Circle())
                .overlay(Circle().strokeBorder(Theme.panel, lineWidth: 3))
                .shadow(color: .black.opacity(0.18), radius: 5, y: 3)
        }
        .buttonStyle(.plain)
        .position(
            x: CGFloat(imageRect.minX + pin.point.x * imageRect.width),
            y: CGFloat(imageRect.minY + pin.point.y * imageRect.height)
        )
        .accessibilityLabel("Pinned idea \(number): \(pin.hypothesis)")
        .accessibilityHint("Edit this private note. It does not affect your guesses.")
        .accessibilityIdentifier("puzzlePinMarker-\(pin.id.uuidString)")
    }
}

private struct PuzzlePinEditor: View {
    @Environment(\.dismiss) private var dismiss
    @FocusState private var editorFocused: Bool

    let pin: PuzzlePin
    let isNew: Bool
    let onSave: (PuzzlePin, String) -> Bool
    let onDelete: (PuzzlePin) -> Bool

    @State private var hypothesis: String

    init(
        pin: PuzzlePin,
        isNew: Bool,
        onSave: @escaping (PuzzlePin, String) -> Bool,
        onDelete: @escaping (PuzzlePin) -> Bool
    ) {
        self.pin = pin
        self.isNew = isNew
        self.onSave = onSave
        self.onDelete = onDelete
        _hypothesis = State(initialValue: pin.hypothesis)
    }

    private var boundedHypothesis: String {
        String(hypothesis.prefix(280))
    }

    private var canSave: Bool {
        !boundedHypothesis.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 7) {
                        Text(isNew ? "What might this mean?" : "Your pinned idea")
                            .font(Theme.display(28))
                            .tracking(-0.6)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Write an observation or a theory. It stays on this device and does not use a guess.")
                            .font(Theme.font(14))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    HStack {
                        Text("PRIVATE NOTE")
                            .font(Theme.font(11, weight: .semibold))
                            .tracking(1.1)
                            .foregroundStyle(Theme.secondary)
                        Spacer()
                        Text("\(boundedHypothesis.count)/280")
                            .font(Theme.font(12, weight: .medium))
                            .monospacedDigit()
                            .foregroundStyle(Theme.secondary)
                            .accessibilityLabel("\(boundedHypothesis.count) of 280 characters")
                    }
                    ZStack(alignment: .topLeading) {
                        if boundedHypothesis.isEmpty {
                            Text("I notice… Maybe it means…")
                                .font(.body)
                                .foregroundStyle(Theme.secondary.opacity(0.78))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 9)
                                .allowsHitTesting(false)
                        }
                        TextEditor(text: $hypothesis)
                            .font(.body)
                            .foregroundStyle(Theme.ink)
                            .scrollContentBackground(.hidden)
                            .focused($editorFocused)
                            .accessibilityLabel("Private pinned puzzle idea")
                            .accessibilityHint("Saved only on this device. Never sent to Eve or submitted as a guess.")
                            .accessibilityIdentifier("puzzlePinEditor")
                    }
                    .frame(minHeight: 148)
                    .padding(8)
                    .background(Theme.canvas, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.20), lineWidth: 1))

                    if !isNew {
                        Button(role: .destructive) {
                            guard onDelete(pin) else { return }
                            editorFocused = false
                            dismiss()
                        } label: {
                            Label("Remove pinned idea", systemImage: "trash")
                                .font(Theme.font(14, weight: .semibold))
                                .frame(minHeight: 44, alignment: .leading)
                        }
                        .accessibilityIdentifier("deletePuzzlePin")
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Theme.canvas.ignoresSafeArea())
            .navigationTitle(isNew ? "Pin an idea" : "Edit idea")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        editorFocused = false
                        dismiss()
                    }
                    .accessibilityIdentifier("cancelPuzzlePinEditor")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard onSave(pin, boundedHypothesis) else { return }
                        editorFocused = false
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(!canSave)
                    .accessibilityIdentifier("savePuzzlePin")
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { editorFocused = false }
                        .accessibilityIdentifier("dismissPuzzlePinKeyboard")
                }
            }
            .onChange(of: hypothesis) { _, updated in
                if updated.count > 280 { hypothesis = String(updated.prefix(280)) }
            }
        }
    }
}
