'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const ConfettiImpl = dynamic(() => import('canvas-confetti').then((mod) => ({ default: mod })), {
  ssr: false,
})

export function Confetti() {
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (isActive && typeof window !== 'undefined') {
      const duration = 2 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          setIsActive(false)
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        ConfettiImpl({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
        ConfettiImpl({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [isActive])

  return null
}

