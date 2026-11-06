# Rebuzzle Game Sounds Implementation Plan

> **For agentic workers:** Use the native execution method in this session. Complete the tasks in order and review the release artifact.

**Goal:** Add optional original sound effects that make Rebuzzle's core puzzle moments feel more like a polished game.

**Architecture:** Bundle four short original WAV cues and play them through a small main-actor audio service using an ambient audio session. Wire playback only to explicit, confirmed state transitions and control it with an independent Settings preference.

**Tech Stack:** Swift 6, SwiftUI, AVFAudio/AVFoundation, XcodeGen.

**Spec:** `docs/superpowers/specs/2026-11-04-rebuzzle-game-sounds-design.md`

## Global Constraints

- iOS 18 minimum; preserve the existing SwiftUI and XcodeGen structure.
- Sound is controlled by `soundEffectsEnabled` and independent of `haptics`.
- Use `AVAudioSession.Category.ambient`; no background music or audio interruptions.
- No sound for cold/wrong guesses, streamed Eve text, or unconfirmed daily/reward responses.
- Suppress cues while VoiceOver is running.
- Do not add or run tests; compile and inspect the release archive and bundled assets.

## Review Focus

- Missing or unreadable bundled audio must not affect gameplay.
- Server errors and stale reward state must not produce success or milestone sounds.
- VoiceOver and the in-app sound toggle must prevent playback immediately.
- Rapid cues must not overlap.
- Archive practice and first-run warm-up must use the same sound preference and asset set.

---

### Task 1: Create the audio service and original cues

**Files:**
- Create: `apps/ios/Rebuzzle/Services/GameSoundPlayer.swift`
- Create: `apps/ios/Rebuzzle/Resources/Sounds/hint.wav`
- Create: `apps/ios/Rebuzzle/Resources/Sounds/close.wav`
- Create: `apps/ios/Rebuzzle/Resources/Sounds/solve.wav`
- Create: `apps/ios/Rebuzzle/Resources/Sounds/reward.wav`

**Interfaces:**
- `GameSoundCue`: `hint`, `closeGuess`, `solve`, `reward`.
- `GameSoundPlayer.shared.play(_:)`: preference-gated, VoiceOver-aware, single-cue playback.

- [x] Generate short, quiet, original WAV cues and bundle them.
- [x] Configure `.ambient`; cache players, stop the previous cue, and fail silently if an asset is unavailable.

### Task 2: Add the sound preference and connect game events

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/SettingsView.swift`
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/Rebuzzle/Features/PracticeGameView.swift`
- Modify: `apps/ios/Rebuzzle/Features/FirstRunTutorialView.swift`
- Modify: `apps/ios/Rebuzzle/Features/JourneyRewards.swift`

- [x] Add an enabled-by-default sound toggle with clear silent-mode/help copy.
- [x] Play hint, close-guess, and solve cues only after their corresponding state transitions are accepted.
- [x] Play the reward cue only on the first transition to a confirmed new badge or level.
- [x] Reuse cues in practice and warm-up; keep haptics unchanged.

### Task 3: Build and upload build 45

**Files:**
- Modify: `apps/ios/project.yml`
- Modify: `apps/ios/Release/Checklist.md`

- [x] Set `CURRENT_PROJECT_VERSION` to `45`.
- [x] Build and archive the Release app; confirm audio files are in the signed app bundle and verify version/build metadata.
- [x] Request a targeted code review, then upload to App Store Connect.
- [x] Record the archive, Apple upload status, and existing Family invite URL.
