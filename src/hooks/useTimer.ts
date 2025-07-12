import { useState, useEffect, useCallback } from 'react'

export const useTimer = (initialTime: number, onTimeUp: () => void) => {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let interval: any = null
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      clearInterval(interval)
      onTimeUp()
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft, onTimeUp])

  const start = useCallback(() => setIsActive(true), [])
  const stop = useCallback(() => setIsActive(false), [])
  const reset = useCallback((newTime: number) => {
    setTimeLeft(newTime)
    setIsActive(false)
  }, [])
  const addPenalty = useCallback((seconds: number) => {
    setTimeLeft((time) => Math.max(0, time - seconds))
  }, [])

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60)
    const secs = timeLeft % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return { timeLeft, formatTime, start, stop, reset, addPenalty, isActive }
}
