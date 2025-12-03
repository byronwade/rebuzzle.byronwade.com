/**
 * Animation Utilities
 * Reusable animation presets using React Native Reanimated
 */

import {
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';

// Animation config presets
export const springConfig = {
  light: {
    damping: 15,
    stiffness: 300,
    mass: 0.5,
  },
  medium: {
    damping: 15,
    stiffness: 200,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  },
  stiff: {
    damping: 20,
    stiffness: 400,
    mass: 1,
  },
};

export const timingConfig = {
  fast: {
    duration: 150,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
  medium: {
    duration: 250,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
  slow: {
    duration: 400,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
};

// Shake animation for incorrect answers
export const shake = (value: SharedValue<number>, intensity = 10) => {
  'worklet';
  value.value = withSequence(
    withTiming(-intensity, { duration: 50 }),
    withTiming(intensity, { duration: 50 }),
    withTiming(-intensity * 0.8, { duration: 50 }),
    withTiming(intensity * 0.8, { duration: 50 }),
    withTiming(-intensity * 0.5, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
};

// Bounce animation for element entry
export const bounceIn = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>
) => {
  'worklet';
  scale.value = 0.3;
  opacity.value = 0;

  scale.value = withSpring(1, springConfig.bouncy);
  opacity.value = withTiming(1, timingConfig.fast);
};

// Bounce out animation
export const bounceOut = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>,
  onComplete?: () => void
) => {
  'worklet';
  scale.value = withSpring(0.3, springConfig.light);
  opacity.value = withTiming(0, timingConfig.fast, (finished) => {
    if (finished && onComplete) {
      runOnJS(onComplete)();
    }
  });
};

// Success pulse animation
export const pulseSuccess = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withSequence(
    withSpring(1.1, springConfig.light),
    withSpring(1, springConfig.medium)
  );
};

// Error pulse animation
export const pulseError = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withSequence(
    withTiming(1.05, { duration: 100 }),
    withTiming(0.95, { duration: 100 }),
    withTiming(1, { duration: 100 })
  );
};

// Fade in up animation for content entrance
export const fadeInUp = (
  translateY: SharedValue<number>,
  opacity: SharedValue<number>,
  delay = 0
) => {
  'worklet';
  translateY.value = 20;
  opacity.value = 0;

  translateY.value = withDelay(
    delay,
    withSpring(0, springConfig.medium)
  );
  opacity.value = withDelay(
    delay,
    withTiming(1, timingConfig.medium)
  );
};

// Fade out down animation
export const fadeOutDown = (
  translateY: SharedValue<number>,
  opacity: SharedValue<number>
) => {
  'worklet';
  translateY.value = withTiming(20, timingConfig.fast);
  opacity.value = withTiming(0, timingConfig.fast);
};

// Ripple animation for button press
export const ripple = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withSequence(
    withTiming(0.95, { duration: 100 }),
    withSpring(1, springConfig.light)
  );
};

// Press animation for buttons
export const pressIn = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withTiming(0.97, { duration: 100 });
};

export const pressOut = (scale: SharedValue<number>) => {
  'worklet';
  scale.value = withSpring(1, springConfig.light);
};

// Continuous pulse animation (for attention)
export const continuousPulse = (scale: SharedValue<number>, intensity = 0.05) => {
  'worklet';
  scale.value = withRepeat(
    withSequence(
      withTiming(1 + intensity, { duration: 1000 }),
      withTiming(1, { duration: 1000 })
    ),
    -1, // Infinite
    true // Reverse
  );
};

// Stop continuous animation
export const stopAnimation = (value: SharedValue<number>, resetTo = 1) => {
  'worklet';
  cancelAnimation(value);
  value.value = resetTo;
};

// Progress bar fill animation
export const animateProgress = (
  progress: SharedValue<number>,
  targetValue: number,
  duration = 1000
) => {
  'worklet';
  progress.value = withTiming(targetValue, {
    duration,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
};

// Stagger animation for list items
export const staggerFadeIn = (
  items: Array<{
    translateY: SharedValue<number>;
    opacity: SharedValue<number>;
  }>,
  staggerDelay = 50
) => {
  items.forEach((item, index) => {
    fadeInUp(item.translateY, item.opacity, index * staggerDelay);
  });
};

// Custom hooks for common animations
export const useShakeAnimation = () => {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const triggerShake = (intensity = 10) => {
    shake(translateX, intensity);
  };

  return { animatedStyle, triggerShake };
};

export const useBounceAnimation = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const triggerBounceIn = () => bounceIn(scale, opacity);
  const triggerBounceOut = (onComplete?: () => void) =>
    bounceOut(scale, opacity, onComplete);

  return { animatedStyle, triggerBounceIn, triggerBounceOut };
};

export const usePulseAnimation = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerSuccess = () => pulseSuccess(scale);
  const triggerError = () => pulseError(scale);

  return { animatedStyle, triggerSuccess, triggerError };
};

export const useFadeInUpAnimation = (delay = 0) => {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const triggerAnimation = () => fadeInUp(translateY, opacity, delay);

  return { animatedStyle, triggerAnimation };
};

export const usePressAnimation = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => pressIn(scale);
  const handlePressOut = () => pressOut(scale);

  return { animatedStyle, handlePressIn, handlePressOut };
};

// Interpolation helpers
export const interpolateScale = (
  progress: SharedValue<number>,
  inputRange: number[] = [0, 1],
  outputRange: number[] = [0.8, 1]
) => {
  'worklet';
  return interpolate(progress.value, inputRange, outputRange, Extrapolate.CLAMP);
};

export const interpolateOpacity = (
  progress: SharedValue<number>,
  inputRange: number[] = [0, 1],
  outputRange: number[] = [0, 1]
) => {
  'worklet';
  return interpolate(progress.value, inputRange, outputRange, Extrapolate.CLAMP);
};

// Timer animation for pulsing when time is low
export const timerPulse = (scale: SharedValue<number>, isLow: boolean) => {
  'worklet';
  if (isLow) {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  } else {
    cancelAnimation(scale);
    scale.value = 1;
  }
};
