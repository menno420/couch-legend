import { describe, expect, it } from 'vitest'
import {
  advanceAfternoonProgress,
  afternoonGoalProgress,
  afternoonGoalsReachedBetween,
  afternoonProgressAt,
  isUnlockNameRevealed,
  nextAfternoonGoal,
  UNLOCK_NAME_REVEAL_RATIO,
} from '../src/lib/progress'

describe('within-afternoon goal selector', () => {
  it('starts with the nearest hidden work tease', () => {
    const goal = nextAfternoonGoal(0)!
    expect(goal.fromHigh).toBe(0)
    expect(goal.atHigh).toBe(4)
    expect(goal.milestones).toEqual([
      { id: 'thinker', kind: 'work', label: 'A career, probably', revealed: false },
    ])
    expect(afternoonGoalProgress(0, goal)).toBe(0)
  })

  it('reveals a shop name at the same 45% boundary as its card', () => {
    expect(UNLOCK_NAME_REVEAL_RATIO).toBe(0.45)
    expect(isUnlockNameRevealed(1.79, 4)).toBe(false)
    expect(isUnlockNameRevealed(1.8, 4)).toBe(true)
    expect(nextAfternoonGoal(1.79)?.milestones[0].label).toBe('A career, probably')
    expect(nextAfternoonGoal(1.8)?.milestones[0]).toMatchObject({ label: 'Unemployed Philosopher', revealed: true })
  })

  it('advances the selector when an exact target is reached', () => {
    const goal = nextAfternoonGoal(4)!
    expect(goal.fromHigh).toBe(4)
    expect(goal.atHigh).toBe(6)
    expect(goal.milestones[0]).toMatchObject({ id: 'water', kind: 'ritual', label: 'Hydration' })
    expect(afternoonGoalProgress(4, goal)).toBe(0)
    expect(afternoonGoalProgress(5, goal)).toBe(0.5)
  })

  it('keeps the same presentation snapshot between meaningful goal changes', () => {
    const snapshot = afternoonProgressAt(2)
    expect(advanceAfternoonProgress(snapshot, 2, 3)).toBe(snapshot)
  })

  it('never forecasts a shop row from a future life chapter', () => {
    expect(nextAfternoonGoal(29, 0)?.milestones.map(item => item.id)).toEqual(['roommate'])
    expect(nextAfternoonGoal(29, 1_700)?.milestones.map(item => item.id)).toEqual(['pinch', 'roommate'])
    expect(nextAfternoonGoal(44, 0)?.atHigh).toBe(60)
    expect(nextAfternoonGoal(44, 510)?.milestones.map(item => item.id)).toEqual(['shift'])
  })

  it('refreshes the forecast when a life chapter makes a row available', () => {
    const before = afternoonProgressAt(29, 0)
    const after = advanceAfternoonProgress(before, 29, 29, 1_700)
    expect(after).toMatchObject({
      phase: 'active',
      goal: { atHigh: 30, milestones: [{ id: 'pinch' }, { id: 'roommate' }] },
    })
  })

  it.each([
    { high: 39, atHigh: 40, ids: ['buzzed', 'playlist'] },
    { high: 399, atHigh: 400, ids: ['baked', 'cushion'] },
    { high: 24_999, atHigh: 25_000, ids: ['mythic', 'cloud'] },
  ])('groups tied unlocks deterministically at High $atHigh', ({ high, atHigh, ids }) => {
    const goal = nextAfternoonGoal(high)!
    expect(goal.atHigh).toBe(atHigh)
    expect(goal.milestones.map(item => item.id)).toEqual(ids)
  })

  it('has no within-afternoon unlock after the final current threshold', () => {
    expect(nextAfternoonGoal(220_000)).toBeNull()
  })

  it('coalesces rapid arrivals instead of silently skipping them', () => {
    const first = advanceAfternoonProgress(afternoonProgressAt(3), 3, 4)
    expect(first).toMatchObject({ phase: 'reached', goals: [{ atHigh: 4 }] })

    const second = advanceAfternoonProgress(first, 4, 6)
    expect(second.phase).toBe('reached')
    if (second.phase === 'reached') {
      expect(second.goals.map(goal => goal.atHigh)).toEqual([4, 6])
      expect(second.goals.flatMap(goal => goal.milestones.map(item => item.id))).toEqual(['thinker', 'water'])
    }
  })

  it('resets a held arrival immediately when High moves backwards', () => {
    const held = advanceAfternoonProgress(afternoonProgressAt(3), 3, 4)
    expect(advanceAfternoonProgress(held, 4, 0)).toEqual(afternoonProgressAt(0))
  })

  it('holds the final arrival before settling on current-shelf completion', () => {
    const finalGoal = nextAfternoonGoal(219_999)!
    const reached = afternoonGoalsReachedBetween(219_999, 220_000)
    expect(reached.map(goal => goal.atHigh)).toEqual([finalGoal.atHigh])
    expect(reached[0].fromHigh).toBe(finalGoal.fromHigh)
    expect(reached[0].milestones.map(item => item.id)).toEqual(finalGoal.milestones.map(item => item.id))
    expect(reached[0].milestones.every(item => item.revealed)).toBe(true)
    expect(afternoonProgressAt(220_000)).toEqual({ phase: 'complete' })
  })
})
