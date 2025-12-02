/**
 * Haptic feedback utilities for mobile touch interactions
 * Uses the Vibration API when available
 */

type VibrationPattern = number | number[];

/**
 * Check if vibration is supported
 */
function isVibrationSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Trigger a vibration pattern safely
 */
function vibrate(pattern: VibrationPattern): boolean {
  if (!isVibrationSupported()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Haptic feedback patterns for different interactions
 */
export const haptics = {
  /** Light tap - button press, selection */
  tap: () => vibrate(10),

  /** Double pulse - correct word typed */
  success: () => vibrate([30, 50, 30]),

  /** Single longer buzz - wrong guess */
  error: () => vibrate(100),

  /** Warning pulse - last attempt */
  warning: () => vibrate([50, 30, 50]),

  /** Celebration pattern - puzzle complete */
  celebration: () => vibrate([100, 50, 100, 50, 200]),

  /** Soft tick - hint revealed */
  hint: () => vibrate(15),

  /** Medium impact - submit action */
  submit: () => vibrate(40),

  /** Cancel any ongoing vibration */
  cancel: () => vibrate(0),
} as const;

/**
 * Type-safe haptic feedback names
 */
export type HapticType = keyof typeof haptics;

/**
 * Trigger haptic feedback by name
 */
export function triggerHaptic(type: HapticType): boolean {
  const handler = haptics[type];
  return handler ? handler() : false;
}

/**
 * Hook-friendly wrapper that returns whether haptics are supported
 */
export function getHapticsSupport(): {
  isSupported: boolean;
  trigger: typeof triggerHaptic;
} {
  return {
    isSupported: isVibrationSupported(),
    trigger: triggerHaptic,
  };
}
