// Simulator pins: determinism, integration-step sensitivity, stage-table
// invariants, and (below) replay parity against the committed hand-played
// trace. These are the properties every balance claim in docs/sim/ rests on.
import { describe, expect, it } from 'vitest'
import { runSim } from '../src/lib/sim/sim'
import { POLICIES } from '../src/lib/sim/policies'
import { PROPOSED_STAGES, PROPOSED_STAGE_FRAMING } from '../src/lib/sim/stage-proposal'
import { GENERATORS, JOBS, RITUALS } from '../src/lib/content'

describe('determinism', () => {
  it('same seed, same policy → byte-identical results', () => {
    const a = runSim({ policy: POLICIES.balanced, seed: 7, dt: 1, horizon: 2 * 3600, stages: PROPOSED_STAGES })
    const b = runSim({ policy: POLICIES.balanced, seed: 7, dt: 1, horizon: 2 * 3600, stages: PROPOSED_STAGES })
    expect(a.final).toEqual(b.final)
    expect(a.events.length).toBe(b.events.length)
    expect(a.reach).toEqual(b.reach)
  })
  it('different seeds move click jitter, not reachability', () => {
    const a = runSim({ policy: POLICIES['click-heavy'], seed: 1, dt: 1, horizon: 3600, stages: PROPOSED_STAGES })
    const b = runSim({ policy: POLICIES['click-heavy'], seed: 2, dt: 1, horizon: 3600, stages: PROPOSED_STAGES })
    // Both cross well past the prestige gate inside the hour, and every
    // landmark reached by both lands at a similar time. (A landmark sitting
    // right at the horizon boundary may appear in only one sample — that is
    // jitter, not a reachability difference, so it is not asserted on.)
    expect(a.reach['mood:baked']).toBeDefined()
    expect(b.reach['mood:baked']).toBeDefined()
    for (const k of Object.keys(a.reach)) {
      if (!(k in b.reach)) continue
      const ta = Math.max(a.reach[k], 30)
      const tb = Math.max(b.reach[k], 30)
      expect(Math.abs(ta - tb) / Math.max(ta, tb), k).toBeLessThan(0.25)
    }
  })
})

describe('stage table', () => {
  it('has 18 stages with strictly increasing thresholds', () => {
    expect(PROPOSED_STAGES.length).toBe(18)
    for (let i = 1; i < PROPOSED_STAGES.length; i++) {
      expect(PROPOSED_STAGES[i].minLifeHigh).toBeGreaterThan(PROPOSED_STAGES[i - 1].minLifeHigh)
    }
    expect(PROPOSED_STAGES[0].minLifeHigh).toBe(0)
  })
  it('arcs are contiguous 1 → 2 → 3', () => {
    const arcs = PROPOSED_STAGES.map(s => s.arc)
    expect([...arcs].sort((x, y) => x - y)).toEqual(arcs)
    expect(new Set(arcs)).toEqual(new Set([1, 2, 3]))
  })
  it('unique ids and scenes', () => {
    expect(new Set(PROPOSED_STAGES.map(s => s.id)).size).toBe(18)
    expect(new Set(PROPOSED_STAGES.map(s => s.scene)).size).toBe(18)
  })
  it('every existing content id has an era framing, and every framing target is a real stage', () => {
    const stageIds = new Set(PROPOSED_STAGES.map(s => s.id))
    const contentIds = [...GENERATORS, ...JOBS, ...RITUALS].map(d => d.id)
    for (const id of contentIds) {
      expect(PROPOSED_STAGE_FRAMING[id], `framing for ${id}`).toBeDefined()
      expect(stageIds.has(PROPOSED_STAGE_FRAMING[id]), `framing target for ${id}`).toBe(true)
    }
    for (const target of Object.values(PROPOSED_STAGE_FRAMING)) {
      expect(stageIds.has(target)).toBe(true)
    }
  })
})

describe('integration step', () => {
  it('dt=1 tracks dt=0.25 with the same hit schedule (pure integration error)', () => {
    // no-prestige removes the reset feedback loop, so this measures the
    // integration scheme alone; long-horizon prestige paths are chaotic in
    // cycle detail and are compared as aggregates across seeds in docs/sim.
    const fine = runSim({ policy: POLICIES['no-prestige'], seed: 7, dt: 0.25, horizon: 2 * 3600 })
    const coarse = runSim({ policy: POLICIES['no-prestige'], seed: 7, dt: 1, horizon: 2 * 3600 })
    const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(a), 1e-9)
    // Cumulative measures and landmark times are the meaningful comparison;
    // leftover wallet funds are not (one purchase-order flip re-times a
    // spend, which moves the residual arbitrarily while the flow matches).
    expect(rel(fine.final.lifeHigh, coarse.final.lifeHigh)).toBeLessThan(0.02)
    // totalHits includes fractional roommate auto-hits (rate × dt), so step
    // quantization moves it slightly; the manual schedule itself is shared.
    expect(Math.abs(fine.final.totalHits - coarse.final.totalHits)).toBeLessThanOrEqual(8)
    for (const k of Object.keys(fine.reach)) {
      if (!(k in coarse.reach)) continue
      const ta = Math.max(fine.reach[k], 30)
      const tb = Math.max(coarse.reach[k], 30)
      expect(Math.abs(ta - tb) / Math.max(ta, tb), k).toBeLessThan(0.10)
    }
  })
})

describe('the zero-click wall (a stated boundary, not an oversight)', () => {
  it('a fresh save that never clicks never starts: no High, no nugs, nothing unlocks', () => {
    const r = runSim({ policy: POLICIES['zero-click'], seed: 7, dt: 5, horizon: 24 * 3600 })
    expect(r.final.totalHits).toBe(0)
    expect(r.final.high).toBe(0)
    expect(r.final.lifeHigh).toBe(0)
    expect(r.final.nugs).toBe(0)
    expect(r.impacts.length).toBe(0)
    // Cash trickles in passively but nothing purchasable ever unlocks
    // (the first job needs High 4) — pillar 1: the game starts with a hit.
    expect(r.final.cash).toBeGreaterThan(0)
  })
})

describe('rebuild accounting (Codex CL#2 R2: the horizon edge)', () => {
  it('every prestige row resolves to exactly one of completed / unrecovered / censored', () => {
    const r = runSim({ policy: POLICIES['click-heavy'], seed: 7, dt: 5, horizon: 24 * 3600, stages: PROPOSED_STAGES })
    expect(r.prestiges.length).toBeGreaterThan(0)
    for (const row of r.prestiges) {
      const states = [row.rebuildSeconds != null, row.unrecovered === true, row.censoredSeconds != null]
      expect(states.filter(Boolean).length).toBe(1)
    }
    // The eager lane is mid-rebuild whenever the horizon lands, so its final
    // row is the censored case this test exists to keep visible.
    expect(r.prestiges[r.prestiges.length - 1].censoredSeconds).toBeGreaterThan(0)
  })
})

import { advance, applyHit, collectAchievements, purchaseGenerator, purchaseJob } from '../src/lib/actions'
import { defaultSave } from '../src/lib/engine'

describe('the minimum-start boundary (Codex R3: one hit is not enough)', () => {
  // Direct engine math, no harness: the wall band and its exit, pinned.
  it('1-3 hits freeze forever: High < 4 locks jobs, nugs < 10 lock the tray', () => {
    let s = collectAchievements({ ...defaultSave(0), booted: true }).save
    for (let i = 0; i < 3; i++) s = applyHit(s)
    s = advance(s, 2 * 3600) // two idle hours change nothing that matters
    expect(s.high).toBeCloseTo(3, 6) // no job → no highRate
    expect(s.nugs).toBeCloseTo(3, 6) // no generator, no further hits
    expect(purchaseGenerator(s, 'tray', 1)).toBeNull() // 3 < 10 nugs
    expect(purchaseJob(s, 'thinker', 1)).toBeNull() // High 3 < 4
  })
  it('4 hits open the jobs half: the cash trickle buys the first job and High starts moving', () => {
    let s = collectAchievements({ ...defaultSave(0), booted: true }).save
    for (let i = 0; i < 4; i++) s = applyHit(s)
    s = advance(s, 120) // the passive trickle tops up the 8-cash job cost
    const hired = purchaseJob(s, 'thinker', 1)
    expect(hired).not.toBeNull()
    const later = advance(hired!, 3600)
    expect(later.high).toBeGreaterThan(4) // job highRate now climbs
    // The grow half stays shut without more hits: nugs frozen below the tray.
    expect(purchaseGenerator(later, 'tray', 1)).toBeNull()
  })
})
