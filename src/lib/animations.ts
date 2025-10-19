/**
 * Animation Utilities
 *
 * Reusable animations and transition helpers
 */

export const animations = {
  // Fade animations
  fadeIn: "animate-in fade-in duration-500",
  fadeOut: "animate-out fade-out duration-300",
  fadeInUp: "animate-in fade-in slide-in-from-bottom-4 duration-500",
  fadeInDown: "animate-in fade-in slide-in-from-top-4 duration-500",

  // Scale animations
  scaleIn: "animate-in zoom-in duration-300",
  scaleOut: "animate-out zoom-out duration-200",

  // Slide animations
  slideInRight: "animate-in slide-in-from-right duration-400",
  slideInLeft: "animate-in slide-in-from-left duration-400",

  // Shake animation (for errors)
  shake: "animate-[shake_0.5s_ease-in-out]",

  // Bounce animation (for success)
  bounce: "animate-bounce",

  // Pulse animation (for attention)
  pulse: "animate-pulse",

  // Spin animation (for loading)
  spin: "animate-spin",
}

export const transitions = {
  fast: "transition-all duration-150 ease-in-out",
  normal: "transition-all duration-300 ease-in-out",
  slow: "transition-all duration-500 ease-in-out",
  colors: "transition-colors duration-200",
  transform: "transition-transform duration-300",
}

/**
 * Haptic feedback for mobile devices
 */
export function hapticFeedback(type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  if (typeof window === "undefined") return
  if (!("vibrate" in navigator)) return

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [50, 100, 50],
  }

  navigator.vibrate(patterns[type])
}

/**
 * Trigger confetti animation
 */
export function triggerConfetti() {
  if (typeof window === "undefined") return
  if (!(window as any).confetti) return

  const duration = 2000
  const animationEnd = Date.now() + duration

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const particleCount = 50 * (timeLeft / duration)

    ;(window as any).confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      origin: {
        x: randomInRange(0.1, 0.3),
        y: Math.random() - 0.2,
      },
    })

    ;(window as any).confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      origin: {
        x: randomInRange(0.7, 0.9),
        y: Math.random() - 0.2,
      },
    })
  }, 250)
}

/**
 * Sound effects
 */
export function playSound(type: "success" | "error" | "click" | "hint") {
  if (typeof window === "undefined") return
  if (!("Audio" in window)) return

  // Check if sound is enabled
  const soundEnabled = localStorage.getItem("soundEnabled") !== "false"
  if (!soundEnabled) return

  // Play appropriate sound
  const sounds = {
    success: "/sounds/success.mp3",
    error: "/sounds/error.mp3",
    click: "/sounds/click.mp3",
    hint: "/sounds/hint.mp3",
  }

  try {
    const audio = new Audio(sounds[type])
    audio.volume = 0.5
    audio.play().catch(() => {
      // Ignore errors (autoplay restrictions)
    })
  } catch (error) {
    // Ignore sound errors
  }
}
