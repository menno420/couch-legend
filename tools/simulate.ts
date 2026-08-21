// Balance experiment runner. One documented command per experiment (sim-lab
// reproducibility): results land in docs/sim/data/ as JSON; the analysis is
// derived from those files, never hand-copied numbers.
//
//   pnpm sim dtsense                    — integration-step sensitivity table
//   pnpm sim baseline [days] [dt]      — long-horizon runs, all policies × seeds
//   pnpm sim analyze                    — fairness metrics + stage placement
//
// Everything is seeded and deterministic; re-running a command reproduces its
// files byte-for-byte (modulo the JSON key order of this same code).

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runSim, type SimResult } from '../src/lib/sim/sim'
import { POLICIES } from '../src/lib/sim/policies'
import { MOODS, STAGES, type StageDef } from '../src/lib/content'
import { DEFAULT_TUNING, PROTO_TUNING, type Tuning } from '../src/lib/engine'

const DATA = join(import.meta.dirname, '..', 'docs', 'sim', 'data')
const SEEDS = [11, 23, 47]
const DAY = 86400

const fmtT = (s: number) => {
  if (!Number.isFinite(s)) return '—'
  if (s < 90) return `${s.toFixed(0)}s`
  if (s < 5400) return `${(s / 60).toFixed(1)}m`
  if (s < 2 * DAY) return `${(s / 3600).toFixed(1)}h`
  return `${(s / DAY).toFixed(1)}d`
}

function dtsense() {
  console.log('# dt sensitivity — no-prestige, 4h, seed 7 (shared hit schedule)')
  const base = runSim({ policy: POLICIES['no-prestige'], seed: 7, dt: 0.5, horizon: 4 * 3600 })
  for (const dt of [1, 2, 5]) {
    const r = runSim({ policy: POLICIES['no-prestige'], seed: 7, dt, horizon: 4 * 3600 })
    const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9)
    const reachDrift = Object.keys(base.reach)
      .filter(k => k in r.reach)
      .map(k => Math.abs(r.reach[k] - base.reach[k]))
      .reduce((a, b) => Math.max(a, b), 0)
    console.log(`dt=${dt}: lifeHigh rel ${(rel(r.final.lifeHigh, base.final.lifeHigh) * 100).toFixed(2)}% · worst reach drift ${reachDrift.toFixed(0)}s · hits Δ ${Math.abs(r.final.totalHits - base.final.totalHits).toFixed(1)}`)
  }
  console.log('(reference dt=0.5)')
}

function runSet(prefix: string, days: number, dt: number, tuning: Tuning) {
  mkdirSync(DATA, { recursive: true })
  for (const name of Object.keys(POLICIES)) {
    for (const seed of SEEDS) {
      const t0 = Date.now()
      const r = runSim({ policy: POLICIES[name], seed, dt, horizon: days * DAY, stages: STAGES, recordEvery: 600, tuning })
      const out: Omit<SimResult, 'events'> & { events?: undefined } = { ...r, events: undefined }
      const file = `${prefix}-${name}-s${seed}.json`
      writeFileSync(join(DATA, file), JSON.stringify(out))
      console.log(`${file}: lifeHigh ${r.final.lifeHigh.toExponential(2)} ench ${r.final.enlightenment} stage ${r.final.stage} prestiges ${r.prestiges.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
    }
  }
}

// The candidate became the engine's DEFAULT_TUNING at adoption (2026-08-21,
// § 7 item 1) — one definition; `tuned`/`adopted` runs read it from the engine.

function invariance() {
  // The playtested first hours must not move: compare proto vs the adopted
  // curve on 2h continuous runs, per landmark reach time and Clarity trajectory.
  console.log('# early-game invariance — proto vs adopted, 2h, dt 1, seed 11')
  for (const p of ['balanced', 'spend-everything', 'click-heavy']) {
    const a = runSim({ policy: POLICIES[p], seed: 11, dt: 1, horizon: 2 * 3600, recordEvery: 1800, tuning: PROTO_TUNING })
    const b = runSim({ policy: POLICIES[p], seed: 11, dt: 1, horizon: 2 * 3600, recordEvery: 1800, tuning: DEFAULT_TUNING })
    let worst = 0
    let worstKey = 'none'
    for (const k of Object.keys(a.reach)) {
      if (!(k in b.reach)) continue
      const d = Math.abs(a.reach[k] - b.reach[k])
      if (d > worst) { worst = d; worstKey = k }
    }
    const encA = a.series.map(x => x.enlightenment)
    const encB = b.series.map(x => x.enlightenment)
    console.log(`- ${p}: worst reach drift ${worst.toFixed(0)}s (${worstKey}) · ench per 30min proto [${encA.join(',')}] vs candidate [${encB.join(',')}]`)
  }
}

/** Fit stage thresholds to the tuned balanced curve at the target cadence. */
function fit() {
  const runs = loadRuns('tuned').filter(r => r.policy === 'balanced')
  if (runs.length === 0) { console.log('run `pnpm sim tuned` first'); return }
  // Target reach days for stages 2..18 (stage 1 is 0): arc 1 inside the first
  // half hour, arc 2 riding the measured bi-phasic curve (fast first day,
  // then ~daily), arc 3 daily beats to day 14 (§ 9.1 north star).
  const targetDays = [0.003, 0.01, 0.02, 0.06, 0.15, 0.4, 0.9, 1.8, 3.0, 4.5, 6.2, 8.0, 9.5, 10.7, 11.8, 12.9, 14.0]
  const med = (x: number) => median(runs.map(r => {
    let prev = { t: 0, lifeHigh: 0 }
    for (const pt of r.series) {
      if (pt.t >= x) {
        const f = (x - prev.t) / Math.max(pt.t - prev.t, 1e-9)
        return prev.lifeHigh + f * (pt.lifeHigh - prev.lifeHigh)
      }
      prev = pt
    }
    return prev.lifeHigh
  }))
  const round2 = (v: number) => {
    const mag = 10 ** Math.floor(Math.log10(Math.max(v, 1)))
    return Math.round(v / (mag / 10)) * (mag / 10)
  }
  console.log('# fitted thresholds (median tuned balanced lifeHigh at target days)')
  targetDays.forEach((d, i) => {
    console.log(`stage ${i + 2}: day ${d} → minLifeHigh ${round2(med(d * DAY)).toExponential(2)}`)
  })
}

function sweep(days: number) {
  // Grid over the two brakes, probed on the three most divergent policies.
  const knees = [40, 80]
  const exps = [0.5, 0.6]
  const caps = [6, 8, Infinity]
  const probes = ['balanced', 'idle-only', 'click-heavy']
  console.log(`# tuning sweep — ${days}d probes, dt 2, seed 11 · columns: ench | lifeHigh | last-day lifeHigh growth ×`)
  console.log(`proto: ${probeRow(PROTO_TUNING, probes, days)}`)
  for (const clarityKnee of knees) for (const claritySoftExp of exps) for (const milestoneCapDoublings of caps) {
    const t: Tuning = { clarityKnee, claritySoftExp, milestoneCapDoublings }
    console.log(`knee${clarityKnee}/exp${claritySoftExp}/cap${milestoneCapDoublings}: ${probeRow(t, probes, days)}`)
  }
}

function probeRow(t: Tuning, probes: string[], days: number): string {
  return probes.map(p => {
    const r = runSim({ policy: POLICIES[p], seed: 11, dt: 2, horizon: days * DAY, recordEvery: 3600, tuning: t })
    const series = r.series
    const at = (d: number) => series.filter(pt => pt.t <= d * DAY).at(-1)?.lifeHigh ?? 0
    const growth = at(days) / Math.max(at(days - 1), 1)
    return `${p}: e${r.final.enlightenment} lh${r.final.lifeHigh.toExponential(1)} g${growth.toFixed(2)}`
  }).join(' · ')
}

interface Run extends Omit<SimResult, 'events'> {}

function loadRuns(prefix: string): Run[] {
  return readdirSync(DATA)
    .filter(f => f.startsWith(`${prefix}-`) && f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(DATA, f), 'utf8')))
}

/** First time lifeHigh crosses x, interpolated on the recorded series. */
function crossTime(run: Run, x: number): number {
  let prev = { t: 0, lifeHigh: 0 }
  for (const p of run.series) {
    if (p.lifeHigh >= x) {
      const f = (x - prev.lifeHigh) / Math.max(p.lifeHigh - prev.lifeHigh, 1e-9)
      return prev.t + f * (p.t - prev.t)
    }
    prev = p
  }
  return Infinity
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function analyze(stages: StageDef[], prefix: 'baseline' | 'tuned' | 'adopted') {
  const runs = loadRuns(prefix)
  if (runs.length === 0) { console.log(`no ${prefix} data — run \`pnpm sim ${prefix}\` first`); return }
  console.log(`\n# analysis of the ${prefix} dataset (${runs.length} runs)`)
  const byPolicy = new Map<string, Run[]>()
  for (const r of runs) {
    byPolicy.set(r.policy, [...(byPolicy.get(r.policy) ?? []), r])
  }

  console.log('\n## Stage reach times (median across seeds — exact crossing events; "~Nd ext" = extrapolated on the run\'s last-3-day growth, REASONED not measured)\n')
  const policies = [...byPolicy.keys()]
  // Tail growth per policy: median daily lifeHigh ratio over the final 3 days.
  const tailGrowth = new Map<string, number>()
  for (const [p, rs] of byPolicy) {
    tailGrowth.set(p, median(rs.map(r => {
      const end = r.series.at(-1)
      const back = r.series.filter(pt => pt.t <= (end?.t ?? 0) - 3 * DAY).at(-1)
      if (!end || !back || back.lifeHigh <= 0) return 1
      return (end.lifeHigh / back.lifeHigh) ** (1 / 3)
    })))
  }
  const reachOrExt = (p: string, st: StageDef): string => {
    const rs = byPolicy.get(p) ?? []
    const med = median(rs.map(r => r.reach[`stage:${st.id}`] ?? Infinity))
    if (Number.isFinite(med)) return fmtT(med)
    const g = tailGrowth.get(p) ?? 1
    if (g <= 1.001) return '—'
    const r = rs[Math.floor(rs.length / 2)]
    const end = r.series.at(-1)
    if (!end || end.lifeHigh <= 0) return '—'
    const days = end.t / DAY + Math.log(st.minLifeHigh / end.lifeHigh) / Math.log(g)
    return days < 90 ? `~${days.toFixed(0)}d ext` : '≫90d ext'
  }
  console.log(`| stage | minLifeHigh | ${policies.join(' | ')} |`)
  console.log(`|---|---|${policies.map(() => '---').join('|')}|`)
  for (const st of stages) {
    if (st.minLifeHigh === 0) continue
    console.log(`| ${st.name} | ${st.minLifeHigh.toExponential(1)} | ${policies.map(p => reachOrExt(p, st)).join(' | ')} |`)
  }

  console.log('\n## Prestige cadence + growth (per policy, median seed)\n')
  for (const [p, rs] of byPolicy) {
    const r = rs[Math.floor(rs.length / 2)]
    const day1 = r.series.filter(pt => pt.t <= DAY).at(-1)
    const dayN = r.series.at(-1)
    console.log(`- ${p}: prestiges ${r.prestiges.length} · ench day1 ${day1?.enlightenment ?? 0} → end ${dayN?.enlightenment ?? 0} · lifeHigh day1 ${day1?.lifeHigh.toExponential(2)} → end ${dayN?.lifeHigh.toExponential(2)}`)
  }

  console.log('\n## Dead stretches (attended play), bucketed by final stage table\n')
  for (const [p, rs] of byPolicy) {
    const worstByArc: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    for (const r of rs) {
      for (const d of r.deadSpans) {
        // Bucket by the state at the span's START: last sample at or before
        // it (falling back to the final sample for spans past the series).
        const lh = (r.series.filter(pt => pt.t <= d.t).at(-1) ?? r.series.at(-1))?.lifeHigh ?? 0
        const st = stages.filter(s2 => lh >= s2.minLifeHigh).at(-1) ?? stages[0]
        worstByArc[st.arc] = Math.max(worstByArc[st.arc], d.span)
      }
    }
    console.log(`- ${p}: worst dead — arc1 ${fmtT(worstByArc[1])} · arc2 ${fmtT(worstByArc[2])} · arc3 ${fmtT(worstByArc[3])}`)
  }

  console.log('\n## Check-ins where the game offered a move (purchase affordable or Wake & Bake lit)\n')
  for (const [p, rs] of byPolicy) {
    const tot = rs.reduce((a, r) => a + r.checkIns.total, 0)
    const wp = rs.reduce((a, r) => a + (r.checkIns.withMove ?? 0), 0)
    if (tot > 0) console.log(`- ${p}: ${wp}/${tot} (${((wp / tot) * 100).toFixed(1)}%)`)
  }

  console.log('\n## Upgrade felt impact (first purchase of each item) — two visibility tiers\n')
  // Purchases whose effect is not an instantly-displayed rate, each with the
  // display surface where the player actually sees it move.
  const DEFERRED_VISIBILITY: Record<string, string> = {
    water: 'buzz visibly falls slower (buzz number + bar persist higher)',
    lamp: 'the buzz number visibly climbs between hits',
    lighter: 'the buzz number jumps further per hit (buzz number + bar)',
    roommate: 'the Hits tile ticks on its own; balances jump per auto-hit',
    curtains: 'the offline report banner shows the bigger kept share',
    cushion: 'the Wake & Bake preview shows the larger Clarity gain',
  }
  for (const [p, rs] of byPolicy) {
    const all = rs.flatMap(r => r.impacts)
    if (all.length === 0) { console.log(`- ${p}: no purchases (the zero-click wall)`); continue }
    const shown = all.filter(i => (i.feltShown ?? 0) > 0)
    const worst = shown.reduce((min, i) => (i.feltShown < min.feltShown ? i : min), { feltShown: Infinity, id: 'none', kind: 'gen', axisShown: '' } as (typeof all)[number])
    const deferred = [...new Set(all.filter(i => (i.feltShown ?? 0) === 0).map(i => i.id))]
    const unmapped = deferred.filter(id => !(id in DEFERRED_VISIBILITY))
    console.log(`- ${p}: displayed-rate floor ${worst.kind}:${worst.id} at ${(worst.feltShown * 100).toFixed(1)}% on ${worst.axisShown} · deferred-visibility items: ${deferred.length ? deferred.map(id => `${id} (${DEFERRED_VISIBILITY[id] ?? 'NO NAMED SURFACE — F5 failure'})`).join(' · ') : 'none'}${unmapped.length ? ' ⚠' : ''}`)
  }

  console.log('\n## Mood ladder (median reach, balanced)\n')
  const bal = byPolicy.get('balanced') ?? []
  for (const m of MOODS) {
    if (m.minHigh === 0) continue
    const meds = median(bal.map(r => r.reach[`mood:${m.id}`] ?? Infinity))
    console.log(`- ${m.name} (High ${m.minHigh}): ${fmtT(meds)}`)
  }

  console.log('\n## Prestige rebuild (time to regain previous peak vs previous cycle), split at banked Clarity 80 (the knee)\n')
  for (const [p, rs] of byPolicy) {
    const early: number[] = []
    const late: number[] = []
    let unrecovered = 0
    let censored = 0
    for (const r of rs) {
      let banked = 0
      for (const row of r.prestiges) {
        const bucket = banked <= 80 ? early : late
        // An unrecovered rebuild (the next reset came first) counts as ∞ —
        // these are precisely the slow rebuilds F6 exists to see; dropping
        // them was a measured survivorship bias (Codex R3). A rebuild the
        // horizon cut off is right-censored: outcome unknown, so it enters
        // no ratio — but it is counted and printed, never silently dropped.
        if (row.unrecovered) { bucket.push(Infinity); unrecovered++ }
        else if (row.rebuildSeconds != null) bucket.push(row.rebuildSeconds / Math.max(row.cycleSeconds, 1))
        else if (row.censoredSeconds != null) censored++
        banked += row.gain
      }
    }
    const stat = (xs: number[]) => xs.length ? `${xs.length} cycles · median ratio ${median(xs).toFixed(2)} · ${((xs.filter(x => x < 0.67).length / xs.length) * 100).toFixed(0)}% <0.67` : 'n/a'
    console.log(`- ${p}: early(≤80) ${stat(early)} · late ${stat(late)} · unrecovered ${unrecovered} · censored-at-horizon ${censored}`)
  }
}

// `baseline-*` and `tuned-*` are FROZEN pre-adoption evidence (the
// 2026-08-20 balance doc reproduces from them, and they were generated
// from the pre-adoption content tables). Regenerating them from today's
// tree would silently swap in the arc-1 prologue economy — so the writer
// commands refuse; only `analyze` still reads them. To genuinely
// reproduce them, run the commands from the pre-adoption tree
// (`git checkout 1e8c685`). The live-state evidence prefix is `adopted`.
const frozen = (prefix: string) => {
  console.log(`\`${prefix}\` is a FROZEN pre-adoption dataset — regenerating it from the current tree would`)
  console.log('overwrite committed evidence with the post-adoption content profile. Run `pnpm sim adopted`')
  console.log('for the live state, or reproduce the frozen data from the pre-adoption tree (git checkout 1e8c685).')
  process.exitCode = 1
}

const [cmd, a1, a2] = process.argv.slice(2)
if (cmd === 'dtsense') dtsense()
else if (cmd === 'baseline') frozen('baseline')
else if (cmd === 'sweep') sweep(Number(a1 ?? 3))
else if (cmd === 'tuned') frozen('tuned')
// Post-adoption evidence set: the adopted DEFAULT_TUNING on the live
// content tables (arc-1 prologue included).
else if (cmd === 'adopted') runSet('adopted', Number(a1 ?? 14), Number(a2 ?? 2), DEFAULT_TUNING)
else if (cmd === 'invariance') invariance()
else if (cmd === 'fit') fit()
else if (cmd === 'analyze') analyze(STAGES, (a1 as 'baseline' | 'tuned' | 'adopted') ?? 'adopted')
else console.log('usage: pnpm sim <dtsense|sweep [days]|adopted [days] [dt]|invariance|fit|analyze [baseline|tuned|adopted]> (baseline/tuned are frozen — see the note above)')
