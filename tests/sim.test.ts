// Simulator pins: determinism, integration-step sensitivity, stage-table
// invariants, and (below) replay parity against the committed hand-played
// trace. These are the properties every balance claim in docs/sim/ rests on.
import { describe, expect, it } from 'vitest'
import { runSim } from '../src/lib/sim/sim'
import { POLICIES } from '../src/lib/sim/policies'
import { GENERATORS, JOBS, RITUALS, STAGES, STAGE_FRAMING, stageCrossed, stageUnlocked } from '../src/lib/content'

describe('determinism', () => {
  it('same seed, same policy → byte-identical results', () => {
    const a = runSim({ policy: POLICIES.balanced, seed: 7, dt: 1, horizon: 2 * 3600, stages: STAGES })
    const b = runSim({ policy: POLICIES.balanced, seed: 7, dt: 1, horizon: 2 * 3600, stages: STAGES })
    expect(a.final).toEqual(b.final)
    expect(a.events.length).toBe(b.events.length)
    expect(a.reach).toEqual(b.reach)
  })
  it('different seeds move click jitter, not reachability', () => {
    const a = runSim({ policy: POLICIES['click-heavy'], seed: 1, dt: 1, horizon: 3600, stages: STAGES })
    const b = runSim({ policy: POLICIES['click-heavy'], seed: 2, dt: 1, horizon: 3600, stages: STAGES })
    // The similarity claim covers the pre-reset opening plus the monotone
    // spines (stage:* rides lifeHigh; prestige:N is a cumulative count).
    // A mood/unlock threshold first TOUCHED after the first Wake & Bake on
    // this eager lane is prestige-phase-quantized — its first-touch moves
    // by whole cycle lengths across seeds (a sawtooth peak either brushes
    // the threshold this cycle or the next) — so those keys are excluded
    // as phase jitter, not reachability. (A landmark may also appear in
    // only one sample at the horizon; the `in` guard drops it.)
    expect(a.reach['mood:baked']).toBeDefined()
    expect(b.reach['mood:baked']).toBeDefined()
    const firstReset = Math.min(a.reach['prestige:1'] ?? Infinity, b.reach['prestige:1'] ?? Infinity)
    for (const k of Object.keys(a.reach)) {
      if (!(k in b.reach)) continue
      const sawtooth = k.startsWith('unlock:') || k.startsWith('mood:')
      if (sawtooth && (a.reach[k] >= firstReset || b.reach[k] >= firstReset)) continue
      const ta = Math.max(a.reach[k], 30)
      const tb = Math.max(b.reach[k], 30)
      expect(Math.abs(ta - tb) / Math.max(ta, tb), k).toBeLessThan(0.25)
    }
  })
})

describe('stage table', () => {
  it('has 18 stages with strictly increasing thresholds', () => {
    expect(STAGES.length).toBe(18)
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].minLifeHigh).toBeGreaterThan(STAGES[i - 1].minLifeHigh)
    }
    expect(STAGES[0].minLifeHigh).toBe(0)
  })
  it('arcs are contiguous 1 → 2 → 3', () => {
    const arcs = STAGES.map(s => s.arc)
    expect([...arcs].sort((x, y) => x - y)).toEqual(arcs)
    expect(new Set(arcs)).toEqual(new Set([1, 2, 3]))
  })
  it('unique ids and scenes', () => {
    expect(new Set(STAGES.map(s => s.id)).size).toBe(18)
    expect(new Set(STAGES.map(s => s.scene)).size).toBe(18)
  })
  it('every content id has an era framing, and every framing target is a real stage', () => {
    const stageIds = new Set(STAGES.map(s => s.id))
    const contentIds = [...GENERATORS, ...JOBS, ...RITUALS].map(d => d.id)
    for (const id of contentIds) {
      expect(STAGE_FRAMING[id], `framing for ${id}`).toBeDefined()
      expect(stageIds.has(STAGE_FRAMING[id]), `framing target for ${id}`).toBe(true)
    }
    for (const target of Object.values(STAGE_FRAMING)) {
      expect(stageIds.has(target)).toBe(true)
    }
  })
  it('every stage carries a beat — the permanent chapter caption', () => {
    for (const st of STAGES) expect(st.beat.trim().length, st.id).toBeGreaterThan(20)
  })
  it('stage-gated rows name a real stage that matches their era framing', () => {
    const stageIds = new Set(STAGES.map(s => s.id))
    for (const d of [...GENERATORS, ...JOBS, ...RITUALS]) {
      if (d.stage == null) continue
      expect(stageIds.has(d.stage), `gate target for ${d.id}`).toBe(true)
      expect(STAGE_FRAMING[d.id], `framing matches gate for ${d.id}`).toBe(d.stage)
    }
  })
  it('stageUnlocked: ungated rows always pass; gated rows key on lifeHigh; unknown stages stay locked', () => {
    expect(stageUnlocked(0, undefined)).toBe(true)
    const cousins = STAGES.find(s => s.id === 'cousins-couch')!
    expect(stageUnlocked(cousins.minLifeHigh - 1, 'cousins-couch')).toBe(false)
    expect(stageUnlocked(cousins.minLifeHigh, 'cousins-couch')).toBe(true)
    expect(stageUnlocked(Number.MAX_VALUE, 'not-a-stage')).toBe(false)
  })
  it('stageCrossed collapses any number of crossings to one final turn, and none to null', () => {
    expect(stageCrossed(0, 100)).toBeNull()
    expect(stageCrossed(0, 600)?.id).toBe('corner-store')
    // A long offline gap can cross several thresholds — one turn, the last.
    expect(stageCrossed(0, 2e4)?.id).toBe('the-couch')
    expect(stageCrossed(2e4, 2e4)).toBeNull()
  })
})

describe('impact rows carry the purchase stage (Codex R3)', () => {
  it('a stage-gated row bought in the pass that crossed its stage records that stage, not the prior one', () => {
    const gateIdx = Object.fromEntries(STAGES.map((st, i) => [st.id, i]))
    const gated = Object.fromEntries([...GENERATORS, ...JOBS, ...RITUALS].filter(d => d.stage).map(d => [d.id, gateIdx[d.stage!]]))
    const r = runSim({ policy: POLICIES['no-prestige'], seed: 23, dt: 1, horizon: 2 * 3600, stages: STAGES })
    const gatedImpacts = r.impacts.filter(i => i.id in gated)
    expect(gatedImpacts.length).toBeGreaterThan(0) // shift/pinch land inside 2 h
    for (const i of gatedImpacts) {
      expect(i.stage, `${i.id} recorded at stage ${i.stage}, gate ${gated[i.id]}`).toBeGreaterThanOrEqual(gated[i.id])
    }
  })
})

describe('stage-gated policies never stall on a locked row', () => {
  it('every proposal a policy makes is purchasable — a locked cheapest row is skipped, not proposed', () => {
    // A null purchase ends the sim's whole decision pass (sim.ts breaks on
    // it), so a policy proposing a stage-locked row would silently starve
    // that archetype's buying. Exercise the spender at a lifeHigh below the
    // prologue stages with everything affordable.
    let s = collectAchievements({ ...defaultSave(0), booted: true, high: 400, lifeHigh: 400, peakHigh: 400, nugs: 1e9, cash: 1e9 }).save
    let purchases = 0
    for (let i = 0; i < 300; i++) {
      const want = POLICIES['spend-everything'].buy(s, DEFAULT_TUNING)
      if (!want) break
      const bought = want.kind === 'gen' ? purchaseGenerator(s, want.id, 1)
        : want.kind === 'job' ? purchaseJob(s, want.id, 1)
        : purchaseRitual(s, want.id)
      expect(bought, `${want.kind}:${want.id} proposed but rejected`).not.toBeNull()
      s = bought!
      purchases++
    }
    expect(purchases).toBeGreaterThan(50) // the pass really ran, wide open
    expect(s.generators.pinch ?? 0).toBe(0) // stage-locked rows stayed shut
    expect(s.jobs.shift ?? 0).toBe(0)
    expect(s.rituals.lighter ?? 0).toBe(0)
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
    // Two hours is enough: the eager lane prestiges every ~11 minutes, and
    // a 24 h horizon blew Vitest's 5 s per-test budget on slower machines
    // (Codex R3 measured 11.9 s in its sandbox).
    const r = runSim({ policy: POLICIES['click-heavy'], seed: 7, dt: 5, horizon: 2 * 3600, stages: STAGES })
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

import { advance, applyHit, collectAchievements, purchaseGenerator, purchaseJob, purchaseRitual } from '../src/lib/actions'
import { DEFAULT_TUNING, defaultSave } from '../src/lib/engine'

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
  it('the 9/10-hit endpoint: nine hits still cannot buy the tray, the tenth can and starts nug production', () => {
    let nine = collectAchievements({ ...defaultSave(0), booted: true }).save
    for (let i = 0; i < 9; i++) nine = applyHit(nine)
    expect(purchaseGenerator(nine, 'tray', 1)).toBeNull() // 9 nugs < 10
    const ten = applyHit(nine)
    const grown = purchaseGenerator(ten, 'tray', 1)
    expect(grown).not.toBeNull() // exactly 10 nugs buys it
    const later = advance(grown!, 3600)
    expect(later.nugs).toBeGreaterThan(grown!.nugs) // nug production is on
  })
})
