import { createContext, useContext, type ReactNode } from 'react'
import { useGame } from '../lib/store'
import { type AfternoonProgressSnapshot } from '../lib/progress'
import { useAfternoonProgress } from '../lib/useAfternoonGoal'

const AfternoonProgressContext = createContext<AfternoonProgressSnapshot | null>(null)

export function AfternoonProgressProvider({ children }: { children: ReactNode }) {
  const high = useGame(s => s.high)
  const lifeHigh = useGame(s => s.lifeHigh)
  const snapshot = useAfternoonProgress(high, lifeHigh)
  return <AfternoonProgressContext.Provider value={snapshot}>{children}</AfternoonProgressContext.Provider>
}

export function useAfternoonProgressSnapshot(): AfternoonProgressSnapshot {
  const snapshot = useContext(AfternoonProgressContext)
  if (!snapshot) throw new Error('Afternoon progress must be read inside its provider')
  return snapshot
}
