// Replay validation: run the recorded actions of a real hand-played browser
// session through the engine on the UI's own 50 ms grid, and compare the
// resulting trajectory against the save snapshots the session flushed. This
// is the brief's § 6 validation step — the simulator's engine seam must match
// reality before any of its curves are believed.

import {
  advance, applyHit, applyPrestige, collectAchievements, purchaseGenerator,
  purchaseJob, purchaseRitual, type SaveState,
} from '../actions'
import { defaultSave, migrateSave, PROTO_TUNING } from '../engine'

// The committed traces were hand-played on the PROTOTYPE curve (a local
// build of e4b168b, before the 2026-08-21 tuning adoption), so the replay
// pins PROTO_TUNING explicitly: these fixtures validate the engine/action
// seam against the reality they recorded, not against the current default.
// (Both traces sit far below the knee, where the curves are identical —
// the pin makes the provenance explicit rather than changing any number.)

export interface TraceAction {
  wall: number
  kind: string
  id?: string
  qty?: number
  /** True when the recorded click demonstrably did not perform the action
   * (e.g. a modal cancel, or a click swallowed by an overlay); established
   * from the driver log + snapshot analysis and annotated in the committed
   * fixture with the evidence. Skipped by the replay. */
  phantom?: boolean
  /** Corrected apply time for an action whose recording lagged its dispatch
   * (the store applies on dispatch; the recorder logs after the click
   * resolves). Derived from snapshot evidence; annotated in the fixture. */
  effectiveWall?: number
}
export interface TraceSnapshot { wall: number; save: SaveState }
export interface Trace {
  meta: { seededSave?: Partial<SaveState> | null; [k: string]: unknown }
  actions: TraceAction[]
  snapshots: TraceSnapshot[]
}

export interface FieldDelta { t: number; sim: number; real: number; rel: number }
export interface ReplayReport {
  compared: number
  misses: string[]
  /** Worst relative error seen per compared field. */
  worst: Record<string, FieldDelta>
  enlightenmentExact: boolean
}

const STEP = 0.05 // the UI's fixed timestep (App.tsx)
const COMPARED = ['high', 'peakHigh', 'nugs', 'cash', 'buzz', 'totalHits', 'playTime'] as const

/** Relative error with an absolute floor so near-zero early values do not
 * turn sub-unit absolute differences into huge ratios. */
const relErr = (sim: number, real: number, floor: number) =>
  Math.abs(sim - real) / Math.max(Math.abs(real), floor)

export function replayTrace(trace: Trace): ReplayReport {
  const start = trace.actions.find(a => a.kind === 'begin' || a.kind === 'resume')
  if (!start) throw new Error('trace has no begin/resume action')
  const t0 = start.wall

  let s: SaveState
  if (trace.meta.seededSave) {
    s = collectAchievements(migrateSave(trace.meta.seededSave)).save
  } else {
    s = collectAchievements({ ...defaultSave(t0), booted: true }).save
  }

  const actions = trace.actions
    .filter(a => a.kind !== 'begin' && a.kind !== 'resume' && !a.phantom)
    .map(a => ({ ...a, wall: a.effectiveWall ?? a.wall }))
    .sort((a, b) => a.wall - b.wall)
  const snapshots = trace.snapshots
    .filter(sn => sn.save.lastTick > t0)
    .slice()
    .sort((a, b) => a.save.lastTick - b.save.lastTick)

  const misses: string[] = []
  const worst: Record<string, FieldDelta> = {}
  let enlightenmentExact = true
  let compared = 0
  let ai = 0
  let si = 0
  let wall = t0

  const applyAction = (a: TraceAction) => {
    if (a.kind === 'hit') { s = applyHit(s, PROTO_TUNING); return }
    let next: SaveState | null = null
    if (a.kind === 'buy-gen' && a.id) next = purchaseGenerator(s, a.id, (a.qty as 1 | 10 | 100) ?? 1)
    else if (a.kind === 'buy-job' && a.id) next = purchaseJob(s, a.id, (a.qty as 1 | 10 | 100) ?? 1)
    else if (a.kind === 'buy-ritual' && a.id) next = purchaseRitual(s, a.id)
    else if (a.kind === 'prestige') next = applyPrestige(s, wall, PROTO_TUNING)
    else { misses.push(`unknown action kind ${a.kind}`); return }
    if (!next) { misses.push(`${a.kind}:${a.id ?? ''}@${((a.wall - t0) / 1000).toFixed(1)}s rejected in replay`); return }
    s = next
  }

  const lastWall = Math.max(
    snapshots.length ? snapshots[snapshots.length - 1].save.lastTick : t0,
    actions.length ? actions[actions.length - 1].wall : t0,
  )

  while (wall < lastWall) {
    while (ai < actions.length && actions[ai].wall <= wall) {
      applyAction(actions[ai])
      s = collectAchievements(s).save
      ai++
    }
    s = collectAchievements(advance(s, STEP, PROTO_TUNING)).save
    wall += STEP * 1000
    while (si < snapshots.length && snapshots[si].save.lastTick <= wall) {
      // An action and a snapshot can land inside the same 50 ms step; the
      // store applies actions before it flushes, so honor that order here.
      while (ai < actions.length && actions[ai].wall <= snapshots[si].save.lastTick) {
        applyAction(actions[ai])
        s = collectAchievements(s).save
        ai++
      }
      const real = snapshots[si].save
      const t = (real.lastTick - t0) / 1000
      for (const f of COMPARED) {
        // Wallet floors: a balance right after a purchase sits near zero,
        // where ≤1 UI tick (50 ms) of action-timing skew plus one hit quantum
        // moves ~2 units — recorder resolution, not model error. A floor of
        // 40 makes the 5% band tolerate exactly that (≤2 units) and nothing
        // more; large balances are governed by the plain relative band.
        const floor = f === 'playTime' ? 30 : f === 'nugs' || f === 'cash' ? 40 : 5
        const rel = relErr(s[f], real[f], floor)
        if (!worst[f] || rel > worst[f].rel) worst[f] = { t, sim: s[f], real: real[f], rel }
      }
      if (s.enlightenment !== real.enlightenment) enlightenmentExact = false
      compared++
      si++
    }
  }

  return { compared, misses, worst, enlightenmentExact }
}
