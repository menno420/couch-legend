import { GENERATORS, JOBS, MOODS, RITUALS, stageUnlocked } from './content'

export type AfternoonMilestoneKind = 'mood' | 'grow' | 'work' | 'ritual'

export interface AfternoonMilestone {
  id: string
  kind: AfternoonMilestoneKind
  label: string
  revealed: boolean
}

export interface AfternoonGoal {
  fromHigh: number
  atHigh: number
  milestones: AfternoonMilestone[]
}

export type AfternoonProgressSnapshot =
  | { phase: 'active'; goal: AfternoonGoal }
  | { phase: 'reached'; goals: AfternoonGoal[] }
  | { phase: 'complete' }

interface MilestoneSource {
  id: string
  kind: AfternoonMilestoneKind
  name: string
  minHigh: number
  order: number
  stage?: string
}

const KIND_ORDER: Record<AfternoonMilestoneKind, number> = {
  mood: 0,
  grow: 1,
  work: 2,
  ritual: 3,
}

const HIDDEN_LABELS: Record<Exclude<AfternoonMilestoneKind, 'mood'>, string> = {
  grow: 'Something green',
  work: 'A career, probably',
  ritual: 'A habit waiting',
}

export const UNLOCK_NAME_REVEAL_RATIO = 0.45

export function isUnlockNameRevealed(high: number, unlockHigh: number): boolean {
  return Number.isFinite(high) && high >= unlockHigh * UNLOCK_NAME_REVEAL_RATIO
}

const MILESTONES: MilestoneSource[] = [
  ...MOODS.map((item, order) => ({ id: item.id, kind: 'mood' as const, name: item.name, minHigh: item.minHigh, order })),
  ...GENERATORS.map((item, order) => ({ id: item.id, kind: 'grow' as const, name: item.name, minHigh: item.unlockHigh, order, stage: item.stage })),
  ...JOBS.map((item, order) => ({ id: item.id, kind: 'work' as const, name: item.name, minHigh: item.unlockHigh, order, stage: item.stage })),
  ...RITUALS.map((item, order) => ({ id: item.id, kind: 'ritual' as const, name: item.name, minHigh: item.unlockHigh, order, stage: item.stage })),
].sort((a, b) => a.minHigh - b.minHigh || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.order - b.order)

function availableMilestones(lifeHigh: number): MilestoneSource[] {
  const safeLifeHigh = Number.isFinite(lifeHigh) ? Math.max(0, lifeHigh) : 0
  return MILESTONES.filter(item => stageUnlocked(safeLifeHigh, item.stage))
}

function previousMilestoneThreshold(atHigh: number, available: MilestoneSource[]): number {
  return available.reduce(
    (latest, item) => item.minHigh < atHigh ? Math.max(latest, item.minHigh) : latest,
    0,
  )
}

function milestonesAt(atHigh: number, revealAtHigh: number, available: MilestoneSource[]): AfternoonMilestone[] {
  return available
    .filter(item => item.minHigh === atHigh)
    .map(item => {
      // Match the shop's shared tease rule. Mood names were already forecast
      // by the couch scene, so they remain readable at any distance.
      const revealed = item.kind === 'mood' || isUnlockNameRevealed(revealAtHigh, item.minHigh)
      return {
        id: item.id,
        kind: item.kind,
        label: revealed || item.kind === 'mood' ? item.name : HIDDEN_LABELS[item.kind],
        revealed,
      }
    })
}

/**
 * The nearest existing within-afternoon unlock. This is a presentation
 * selector only: it derives from the canonical content tables and cannot
 * create a gate, reward, timer, or save field.
 */
export function nextAfternoonGoal(high: number, lifeHigh = 0): AfternoonGoal | null {
  const safeHigh = Number.isFinite(high) ? Math.max(0, high) : 0
  const available = availableMilestones(lifeHigh)
  const next = available.find(item => item.minHigh > safeHigh)
  if (!next) return null

  const atHigh = next.minHigh
  const fromHigh = previousMilestoneThreshold(atHigh, available)
  const milestones = milestonesAt(atHigh, safeHigh, available)

  return { fromHigh, atHigh, milestones }
}

export function afternoonGoalsReachedBetween(previousHigh: number, high: number, lifeHigh = 0): AfternoonGoal[] {
  const from = Number.isFinite(previousHigh) ? Math.max(0, previousHigh) : 0
  const to = Number.isFinite(high) ? Math.max(0, high) : 0
  if (to <= from) return []
  const available = availableMilestones(lifeHigh)

  const thresholds = [...new Set(
    available
      .filter(item => item.minHigh > from && item.minHigh <= to)
      .map(item => item.minHigh),
  )]

  return thresholds.map(atHigh => ({
    fromHigh: previousMilestoneThreshold(atHigh, available),
    atHigh,
    milestones: milestonesAt(atHigh, atHigh, available),
  }))
}

export function afternoonProgressAt(high: number, lifeHigh = 0): AfternoonProgressSnapshot {
  const goal = nextAfternoonGoal(high, lifeHigh)
  return goal ? { phase: 'active', goal } : { phase: 'complete' }
}

function sameGoalPresentation(a: AfternoonGoal, b: AfternoonGoal): boolean {
  return a.fromHigh === b.fromHigh
    && a.atHigh === b.atHigh
    && a.milestones.length === b.milestones.length
    && a.milestones.every((item, index) => {
      const other = b.milestones[index]
      return item.id === other.id && item.kind === other.kind
        && item.label === other.label && item.revealed === other.revealed
    })
}

function refreshedAfternoonProgress(
  snapshot: AfternoonProgressSnapshot,
  high: number,
  lifeHigh: number,
): AfternoonProgressSnapshot {
  const next = nextAfternoonGoal(high, lifeHigh)
  if (!next) return snapshot.phase === 'complete' ? snapshot : { phase: 'complete' }
  if (snapshot.phase === 'active' && sameGoalPresentation(snapshot.goal, next)) return snapshot
  return { phase: 'active', goal: next }
}

/** Pure transition used by the timed presentation hook and its tests. */
export function advanceAfternoonProgress(
  snapshot: AfternoonProgressSnapshot,
  previousHigh: number,
  high: number,
  lifeHigh = 0,
): AfternoonProgressSnapshot {
  if (high < previousHigh) return refreshedAfternoonProgress(snapshot, high, lifeHigh)

  const reached = afternoonGoalsReachedBetween(previousHigh, high, lifeHigh)
  if (reached.length === 0) {
    return snapshot.phase === 'reached' ? snapshot : refreshedAfternoonProgress(snapshot, high, lifeHigh)
  }

  if (snapshot.phase !== 'reached') return { phase: 'reached', goals: reached }

  const combined = [...snapshot.goals]
  for (const goal of reached) {
    if (!combined.some(item => item.atHigh === goal.atHigh)) combined.push(goal)
  }
  return { phase: 'reached', goals: combined.sort((a, b) => a.atHigh - b.atHigh) }
}

export function afternoonGoalProgress(high: number, goal: AfternoonGoal): number {
  const span = goal.atHigh - goal.fromHigh
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, (high - goal.fromHigh) / span))
}
