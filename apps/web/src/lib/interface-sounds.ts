import { readAppSettings } from "@/lib/app-settings";
import { clickSoftSound } from "@/lib/click-soft";
import { error002Sound } from "@/lib/error-002";
import { notificationPopSound } from "@/lib/notification-pop";
import { question001Sound } from "@/lib/question-001";
import { playSound } from "@/lib/sound-engine";
import type { SoundAsset } from "@/lib/sound-types";
import { successChimeSound } from "@/lib/success-chime";
import { switchOffSound } from "@/lib/switch-off";
import { switchOnSound } from "@/lib/switch-on";

export type InterfaceSoundCue =
  | "submit"
  | "success"
  | "near-miss"
  | "incorrect"
  | "failure"
  | "hint"
  | "notification"
  | "sound-on"
  | "sound-off";

interface CueDefinition {
  asset: SoundAsset;
  volume: number;
  playbackRate?: number;
}

const CUES: Record<InterfaceSoundCue, CueDefinition> = {
  submit: { asset: clickSoftSound, volume: 0.22 },
  success: { asset: successChimeSound, volume: 0.42 },
  "near-miss": { asset: notificationPopSound, volume: 0.26, playbackRate: 1.06 },
  incorrect: { asset: error002Sound, volume: 0.2 },
  failure: { asset: error002Sound, volume: 0.28, playbackRate: 0.88 },
  hint: { asset: question001Sound, volume: 0.28 },
  notification: { asset: notificationPopSound, volume: 0.24 },
  "sound-on": { asset: switchOnSound, volume: 0.24 },
  "sound-off": { asset: switchOffSound, volume: 0.2 },
};

interface PlayInterfaceSoundOptions {
  /** Used only by the sound preference control so users can hear the setting change. */
  ignorePreference?: boolean;
  /** Override cue pitch — used for graded incorrect feedback. */
  playbackRate?: number;
}

export async function playInterfaceSound(
  cue: InterfaceSoundCue,
  options: PlayInterfaceSoundOptions = {}
): Promise<boolean> {
  if (!options.ignorePreference && !readAppSettings().sound) {
    return false;
  }

  const definition = CUES[cue];
  try {
    await playSound(definition.asset.dataUri, {
      volume: definition.volume,
      playbackRate: options.playbackRate ?? definition.playbackRate,
    });
    return true;
  } catch (error) {
    // Audio feedback is progressive enhancement and must never interrupt gameplay.
    if (process.env.NODE_ENV === "development") {
      console.debug(`Unable to play interface sound: ${cue}`, error);
    }
    return false;
  }
}
