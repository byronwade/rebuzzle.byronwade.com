import AVFoundation
import UIKit

enum GameSoundCue: String, Hashable, Sendable {
    case hint
    case closeGuess = "close"
    case solve
    case reward
}

@MainActor
final class GameSoundPlayer {
    static let shared = GameSoundPlayer()

    private var players: [GameSoundCue: AVAudioPlayer] = [:]
    private var audioSessionConfigured = false
    private var voiceOverObserver: NSObjectProtocol?

    private init() {
        voiceOverObserver = NotificationCenter.default.addObserver(
            forName: UIAccessibility.voiceOverStatusDidChangeNotification,
            object: nil,
            queue: .main
        ) { _ in
            Task { @MainActor in
                guard UIAccessibility.isVoiceOverRunning else { return }
                GameSoundPlayer.shared.stop()
            }
        }
    }

    func stop() {
        players.values.forEach { $0.stop() }
    }

    func play(_ cue: GameSoundCue) {
        guard (UserDefaults.standard.object(forKey: "soundEffectsEnabled") as? Bool) ?? true,
              !UIAccessibility.isVoiceOverRunning else { return }

        if !audioSessionConfigured {
            do {
                try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
                audioSessionConfigured = true
            } catch {
                return
            }
        }

        let player: AVAudioPlayer
        if let cached = players[cue] {
            player = cached
        } else {
            guard let url = Bundle.main.url(forResource: cue.rawValue, withExtension: "wav"),
                  let loaded = try? AVAudioPlayer(contentsOf: url) else { return }
            loaded.volume = 0.58
            loaded.prepareToPlay()
            players[cue] = loaded
            player = loaded
        }

        players.values.forEach { $0.stop() }
        player.currentTime = 0
        player.play()
    }
}
