import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  advanceAfternoonProgress,
  afternoonProgressAt,
  type AfternoonProgressSnapshot,
} from './progress'

const GOAL_COMPLETION_HOLD_MS = 450

function reachedSignature(snapshot: AfternoonProgressSnapshot): string | null {
  if (snapshot.phase !== 'reached') return null
  return snapshot.goals.map(goal => goal.atHigh).join(':')
}

/** Coalesce rapid arrivals, then hold their completed state long enough to read. */
export function useAfternoonProgress(high: number, lifeHigh: number): AfternoonProgressSnapshot {
  const [snapshot, setSnapshot] = useState<AfternoonProgressSnapshot>(() => afternoonProgressAt(high, lifeHigh))
  const previousHigh = useRef(high)
  const latestHigh = useRef(high)
  const latestLifeHigh = useRef(lifeHigh)

  useLayoutEffect(() => {
    latestHigh.current = high
    latestLifeHigh.current = lifeHigh
    setSnapshot(current => advanceAfternoonProgress(current, previousHigh.current, high, lifeHigh))
    previousHigh.current = high
  }, [high, lifeHigh])

  const signature = reachedSignature(snapshot)
  useEffect(() => {
    if (signature == null) return
    const timer = window.setTimeout(
      () => setSnapshot(afternoonProgressAt(latestHigh.current, latestLifeHigh.current)),
      GOAL_COMPLETION_HOLD_MS,
    )
    return () => window.clearTimeout(timer)
  }, [signature])

  return snapshot
}
