/**
 * Animation Utilities
 * Reusable animation configurations for consistent motion design
 */

import { withSpring, withTiming, withSequence, Easing } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

// Animation duration constants
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
} as const;

// Spring configuration presets
export const SPRING_CONFIG = {
  gentle: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.8,
  },
  stiff: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  wobbly: {
    damping: 8,
    stiffness: 120,
    mass: 1,
  },
} as const;

// Timing configuration presets
export const TIMING_CONFIG = {
  easeIn: {
    duration: ANIMATION_DURATION.normal,
    easing: Easing.in(Easing.ease),
  },
  easeOut: {
    duration: ANIMATION_DURATION.normal,
    easing: Easing.out(Easing.ease),
  },
  easeInOut: {
    duration: ANIMATION_DURATION.normal,
    easing: Easing.inOut(Easing.ease),
  },
  linear: {
    duration: ANIMATION_DURATION.normal,
    easing: Easing.linear,
  },
} as const;

/**
 * Shake animation for error feedback
 */
export function shakeAnimation(value: SharedValue<number>, intensity: number = 10) {
  'worklet';
  value.value = withSequence(
    withTiming(-intensity, { duration: 50 }),
    withTiming(intensity, { duration: 50 }),
    withTiming(-intensity, { duration: 50 }),
    withTiming(intensity, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
}

/**
 * Bounce in animation for entering elements
 */
export function bounceInAnimation(value: SharedValue<number>) {
  'worklet';
  value.value = withSequence(
    withSpring(1.1, SPRING_CONFIG.bouncy),
    withSpring(1, SPRING_CONFIG.gentle)
  );
}

/**
 * Press in animation for button feedback
 */
export function pressIn(value: SharedValue<number>, targetScale: number = 0.97) {
  'worklet';
  value.value = withSpring(targetScale, SPRING_CONFIG.stiff);
}

/**
 * Press out animation for button feedback
 */
export function pressOut(value: SharedValue<number>) {
  'worklet';
  value.value = withSpring(1, SPRING_CONFIG.gentle);
}

/**
 * Fade in up animation for entering content
 */
export function fadeInUp(
  opacity: SharedValue<number>,
  translateY: SharedValue<number>,
  distance: number = 20
) {
  'worklet';
  opacity.value = withTiming(1, TIMING_CONFIG.easeOut);
  translateY.value = withSpring(0, SPRING_CONFIG.gentle);
}

/**
 * Fade out down animation for exiting content
 */
export function fadeOutDown(
  opacity: SharedValue<number>,
  translateY: SharedValue<number>,
  distance: number = 20
) {
  'worklet';
  opacity.value = withTiming(0, TIMING_CONFIG.easeIn);
  translateY.value = withTiming(distance, TIMING_CONFIG.easeIn);
}

/**
 * Pulse animation for success feedback
 */
export function pulseSuccess(value: SharedValue<number>) {
  'worklet';
  value.value = withSequence(
    withSpring(1.15, SPRING_CONFIG.bouncy),
    withSpring(1, SPRING_CONFIG.gentle)
  );
}

/**
 * Pulse animation for error feedback
 */
export function pulseError(value: SharedValue<number>) {
  'worklet';
  value.value = withSequence(
    withSpring(0.95, SPRING_CONFIG.stiff),
    withSpring(1, SPRING_CONFIG.gentle)
  );
}

/**
 * Heart beat animation (for attempts/lives)
 */
export function heartBeat(value: SharedValue<number>) {
  'worklet';
  value.value = withSequence(
    withTiming(1.2, { duration: 100 }),
    withTiming(1, { duration: 100 }),
    withTiming(1.2, { duration: 100 }),
    withTiming(1, { duration: 200 })
  );
}

/**
 * Stagger delay calculator for list animations
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

export default {
  ANIMATION_DURATION,
  SPRING_CONFIG,
  TIMING_CONFIG,
  shakeAnimation,
  bounceInAnimation,
  pressIn,
  pressOut,
  fadeInUp,
  fadeOutDown,
  pulseSuccess,
  pulseError,
  heartBeat,
  getStaggerDelay,
};
