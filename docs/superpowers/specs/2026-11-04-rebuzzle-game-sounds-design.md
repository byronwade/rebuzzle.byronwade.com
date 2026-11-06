# Rebuzzle Game Sounds Design

## Intent

Give Rebuzzle a small, recognizable sound identity so guesses, hints, solves, and earned milestones feel tactile and rewarding. Sound remains optional and secondary to the conversation, puzzle, and the player's other audio.

## Goals

- Create four original, bundled, short cues for a hint, a close guess, a solve, and a confirmed Journey reward.
- Reuse the cues in the daily game, first-run warm-up, and unscored archive practice so those modes feel like one game.
- Add a persistent `Sound effects` preference, independent of haptics.
- Keep cold or ordinary wrong guesses, keyboard interactions, and streamed Eve text silent.
- Play solve and close-guess sounds only after the server confirms the guess; play Journey reward sound only after a complete snapshot confirms the matching completion and newly earned reward.
- Suppress game audio while VoiceOver is running so it does not compete with spoken feedback.
- Use `AVAudioSession.Category.ambient` so cues mix with other audio and follow iPhone Silent mode.

## Non-goals

- Background music, looping ambience, audio narration, or a system Now Playing interface.
- Changes to puzzle scoring, the AI feedback service, or haptics.
- Sound on cold guesses, generic failures, or every incremental Eve update.

## Design calls

- The default is enabled. The sound toggle is visible beside haptics in Settings and takes effect immediately.
- Cues are soft, warm, brief, and original to Rebuzzle. They use a gentle melodic palette rather than arcade bleeps or loud percussion.
- A close-guess cue plays for server-confirmed `close` or `warm` reactions on a non-terminal guess. Cold guesses stay quiet.
- A solve cue plays once for a server-confirmed successful daily or practice guess. The scripted warm-up uses the same solve cue.
- A reward cue plays once when the result's existing confirmation key first becomes non-empty for a newly earned badge or level. Reappearing views and streamed replies do not replay it.
- The hint cue plays only after a hint is actually revealed.
- One cue at a time: a new cue stops any currently playing cue. Missing or unreadable audio is a silent no-op.
- WAV assets are generated specifically for Rebuzzle and bundled with the iOS app; no runtime network audio or third-party audio package is introduced.

## Accessibility and platform behavior

Sound and haptics are separate preferences. Ambient audio mixes with other apps and responds to the Silent switch, as Apple describes for nonessential game sounds. VoiceOver users keep the existing spoken labels and haptics without overlapping game audio. The cues are brief and do not depend on motion, so Reduce Motion does not disable them.

## Implementation

Add a small main-actor `GameSoundPlayer` around cached `AVAudioPlayer` instances and four bundled WAV cues. Wire calls to confirmed state transitions in `AppModel`, `PracticeGameView`, `FirstRunTutorialView`, and `JourneyRewards`; add the independent preference to the existing Settings appearance/haptics section.
