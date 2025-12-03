/**
 * Sound Effects using Web Audio API
 * Generates programmatic sounds without external audio files
 */

let audioContext: AudioContext | null = null;
let soundsEnabled = true;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  // Resume context if suspended (required after user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function setSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}

export function getSoundsEnabled(): boolean {
  return soundsEnabled;
}

/**
 * Play a pleasant success chime - C major arpeggio
 */
export function playCorrectSound(): void {
  if (!soundsEnabled) return;

  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
}

/**
 * Play a short error buzz - low frequency
 */
export function playWrongSound(): void {
  if (!soundsEnabled) return;

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 200;
    osc.type = 'square';

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
}

/**
 * Play a triumphant fanfare - rising notes
 */
export function playAchievementSound(): void {
  if (!soundsEnabled) return;

  try {
    const ctx = getAudioContext();
    const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'triangle';

      const startTime = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
}

/**
 * Play an ascending scale with shimmer - level up celebration
 */
export function playLevelUpSound(): void {
  if (!soundsEnabled) return;

  try {
    const ctx = getAudioContext();
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99]; // C4 to G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
}

/**
 * Play a gentle hint notification
 */
export function playHintSound(): void {
  if (!soundsEnabled) return;

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880; // A5
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
}
