/**
 * Stage-evolution census — the measured answer to "do the 18 chapters differ
 * mechanically, or only in scenery?"
 *
 * It imports the REAL content tables (never a retyped copy) and, per stage,
 * counts every mechanical thing that actually begins at that stage boundary:
 * stage-gated content rows, new player verbs, new automation classes, new
 * systems. Framing-only assignments (STAGE_FRAMING) are deliberately NOT
 * counted — the whole point is to separate "the room is recoloured" from
 * "something new is available".
 *
 * Run: pnpm tsx tools/stage-evolution.ts [--selftest]
 */
import {
  GENERATORS, JOBS, RITUALS, STAGES, STAGE_FRAMING, ARC_NAMES, KEEPSAKES,
  SLOT_STAGES, baseSlotsFor,
  type KeepsakeDef, type StageDef,
} from '../src/lib/content'
import { STAGE_PRESENTATION } from '../src/lib/presentation'

export interface StageCensusRow {
  id: string
  name: string
  arc: 1 | 2 | 3
  minLifeHigh: number
  /** Rows that genuinely BEGIN at this stage (a real `stage` gate). */
  newGenerators: string[]
  newJobs: string[]
  newRituals: string[]
  /** Rows merely re-coloured by this stage (STAGE_FRAMING) — not availability. */
  framedItems: string[]
  /** Delivered scene art, vs riding the anchor pair. */
  sceneDelivered: boolean
  /** Total content rows that begin here. */
  newContentRows: number
  /** A stage introduces a MECHANIC when it adds a verb, a system or an
   * automation class — not merely another priced row on an existing shelf. */
  newMechanics: string[]
  /** Effect shapes this chapter DEEPENS rather than introduces. */
  deepens: string[]
  /** Places on the couch once this chapter is reached. */
  slots: number
}

/**
 * Verbs and systems a stage begins — derived from source, never asserted.
 *
 * A stage introduces a MECHANIC when it adds something the player could not
 * do before: the FIRST appearance of an effect shape, or a widening of the
 * couch (which changes the arrangement decision rather than only adding to
 * it). A later chapter that supplies a STRONGER VALUE of a shape already
 * introduced is a different thing — it deepens the family and can retire an
 * earlier keepsake — and it is counted separately.
 *
 * That distinction is not cosmetic. Counting every keepsake as a new mechanic
 * inflated the headline from 13/18 to 17/18, which is the central before/after
 * claim of the whole change. (Codex CL#19 R3, P1 — conceded; every published
 * copy of 17/18 was corrected.)
 *
 * Before 2026-09-04 this returned [] for every stage: 0 of 18, honestly.
 */
const shapeKey = (e: KeepsakeDef['effect']): string =>
  'target' in e ? `${e.kind}:${e.target}` : e.kind

function firstIntroductions(): Map<string, string> {
  // shape -> the first stage (in story order) that introduces it
  const seen = new Map<string, string>()
  for (const st of STAGES) {
    const k = KEEPSAKES.find(x => x.stage === st.id)
    if (!k) continue
    const key = shapeKey(k.effect)
    if (!seen.has(key)) seen.set(key, st.id)
  }
  return seen
}

const FIRST = firstIntroductions()

function mechanicsBeginningAt(stage: StageDef): string[] {
  const out: string[] = []
  const k = KEEPSAKES.find(x => x.stage === stage.id)
  if (k && FIRST.get(shapeKey(k.effect)) === stage.id) out.push(`keepsake:${shapeKey(k.effect)}`)
  if ((SLOT_STAGES as readonly string[]).includes(stage.id)) out.push('couch:+1 place')
  return out
}

/** A stage that supplies a stronger version of a shape introduced earlier. */
function masteryAt(stage: StageDef): string[] {
  const k = KEEPSAKES.find(x => x.stage === stage.id)
  if (!k) return []
  const key = shapeKey(k.effect)
  return FIRST.get(key) === stage.id ? [] : [`deepens:${key} (first at ${FIRST.get(key)})`]
}

export function census(): StageCensusRow[] {
  return STAGES.map(st => {
    const newGenerators = GENERATORS.filter(g => g.stage === st.id).map(g => g.id)
    const newJobs = JOBS.filter(j => j.stage === st.id).map(j => j.id)
    const newRituals = RITUALS.filter(r => r.stage === st.id).map(r => r.id)
    const framedItems = Object.entries(STAGE_FRAMING)
      .filter(([id, stage]) => stage === st.id
        && !newGenerators.includes(id) && !newJobs.includes(id) && !newRituals.includes(id))
      .map(([id]) => id)
    return {
      id: st.id,
      name: st.name,
      arc: st.arc,
      minLifeHigh: st.minLifeHigh,
      newGenerators, newJobs, newRituals, framedItems,
      sceneDelivered: STAGE_PRESENTATION[st.id]?.status === 'delivered',
      slots: baseSlotsFor(st.minLifeHigh),
      newContentRows: newGenerators.length + newJobs.length + newRituals.length,
      newMechanics: mechanicsBeginningAt(st),
      deepens: masteryAt(st),
    }
  })
}

/** Known positives and negatives, asserted against the live tables. A census
 * that silently returns zeroes for everything passes no test here. */
function selftest(): number {
  const rows = census()
  const by = (id: string) => {
    const r = rows.find(x => x.id === id)
    if (!r) throw new Error(`unknown stage ${id}`)
    return r
  }
  const checks: [string, boolean][] = [
    // POSITIVES — stages that demonstrably gate new content today.
    ['positive corner-store has exactly 1 new row', by('corner-store').newContentRows === 1],
    ['positive corner-store new row is the job `shift`', by('corner-store').newJobs.join() === 'shift'],
    ['positive cousins-couch has exactly 3 new rows', by('cousins-couch').newContentRows === 3],
    ['positive cousins-couch gates 2 generators', by('cousins-couch').newGenerators.length === 2],
    ['positive cousins-couch gates 1 ritual', by('cousins-couch').newRituals.join() === 'lighter'],
    ['positive first-light scene is delivered art', by('first-light').sceneDelivered === true],
    // NEGATIVES — stages that must NOT be scored as introducing content.
    ['negative first-light gates 0 new rows', by('first-light').newContentRows === 0],
    ['negative the-couch gates 0 new rows', by('the-couch').newContentRows === 0],
    ['negative the-operation gates 0 new rows', by('the-operation').newContentRows === 0],
    ['negative long-afternoon gates 0 new rows', by('long-afternoon').newContentRows === 0],
    ['negative the-operation scene is NOT delivered', by('the-operation').sceneDelivered === false],
    // The framing lane must be non-empty for a stage that frames items but
    // gates none — otherwise the instrument cannot tell recolour from silence.
    ['control the-operation frames >=1 existing item', by('the-operation').framedItems.length >= 1],
    ['control census covers all 18 stages', rows.length === 18],
    // POSITIVES for the mechanic lane — added 2026-09-04 when keepsakes made
    // it non-empty. Before then it returned [] for every stage by design.
    ['positive corner-store begins a mechanic (its keepsake)', by('corner-store').newMechanics.length >= 1],
    // The distinction the P1 was about: a stronger value of an existing shape
    // is mastery, not a new mechanic, and the census must not conflate them.
    ['negative mythic-canopy DEEPENS buzz-floor rather than introducing it',
      by('mythic-canopy').newMechanics.length === 0 && by('mythic-canopy').deepens.length === 1],
    ['negative long-afternoon DEEPENS clarity-yield', by('long-afternoon').deepens.length === 1],
    ['positive cousins-couch INTRODUCES buzz-floor', by('cousins-couch').newMechanics.some(m => m.includes('buzz-floor'))],
    ['control every chapter either introduces, deepens, or gates content — except the first',
      rows.filter(r => r.newMechanics.length === 0 && r.deepens.length === 0 && r.newContentRows === 0).length === 1],
    ['positive corner-store also widens the couch', by('corner-store').newMechanics.includes('couch:+1 place')],
    ['positive the-operation begins a mechanic despite gating no content row',
      by('the-operation').newContentRows === 0 && by('the-operation').newMechanics.length === 1],
    ['negative first-light begins no mechanic (the bare couch)', by('first-light').newMechanics.length === 0],
    ['control places never exceed keepsakes earned', rows.every(r => r.slots <= KEEPSAKES.filter(k => STAGES.findIndex(s2 => s2.id === k.stage) <= STAGES.findIndex(s2 => s2.id === r.id)).length)],
  ]
  let failed = 0
  for (const [label, ok] of checks) {
    if (!ok) failed++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  }
  console.log(`\nselftest: ${checks.length - failed}/${checks.length} passed`)
  return failed
}

function report(): void {
  const rows = census()
  console.log('stage'.padEnd(20), 'arc'.padEnd(16), 'new'.padEnd(4), 'framed'.padEnd(7), 'places'.padEnd(7), 'scene'.padEnd(12), 'mechanics')
  for (const r of rows) {
    console.log(
      r.id.padEnd(20),
      `${r.arc} ${ARC_NAMES[r.arc]}`.padEnd(16),
      String(r.newContentRows).padEnd(4),
      String(r.framedItems.length).padEnd(7),
      String(r.slots).padEnd(7),
      (r.sceneDelivered ? 'delivered' : 'anchor').padEnd(12),
      r.newMechanics.length ? r.newMechanics.join(', ') : (r.deepens.join(', ') || '—'),
    )
  }
  const withContent = rows.filter(r => r.newContentRows > 0)
  const withMechanic = rows.filter(r => r.newMechanics.length > 0)
  const withMastery = rows.filter(r => r.newMechanics.length === 0 && r.deepens.length > 0)
  const withAnything = rows.filter(r => r.newMechanics.length > 0 || r.deepens.length > 0 || r.newContentRows > 0)
  const delivered = rows.filter(r => r.sceneDelivered)
  console.log(`\nCENSUS — ${rows.length} stages total`)
  console.log(`  gate ANY new content row : ${withContent.length}/${rows.length}  (${withContent.map(r => r.id).join(', ') || 'none'})`)
  console.log(`  introduce a new MECHANIC : ${withMechanic.length}/${rows.length}  (${withMechanic.map(r => r.id).join(', ') || 'none'})`)
  console.log(`  DEEPEN an existing shape : ${withMastery.length}/${rows.length}  (${withMastery.map(r => r.id).join(', ') || 'none'})`)
  console.log(`  deliver ANYTHING new     : ${withAnything.length}/${rows.length}`)
  console.log(`  have delivered scene art : ${delivered.length}/${rows.length}  (${delivered.map(r => r.id).join(', ')})`)
  console.log(`  content rows gated total : ${rows.reduce((a, r) => a + r.newContentRows, 0)} of ${GENERATORS.length + JOBS.length + RITUALS.length} shelf rows`)
  console.log(`  keepsakes minted total   : ${KEEPSAKES.length} across ${new Set(KEEPSAKES.map(k => k.stage)).size} chapters, into ${baseSlotsFor(Infinity)} places`)
}

const selftestMode = process.argv.includes('--selftest')
if (selftestMode) process.exit(selftest() === 0 ? 0 : 1)
else report()
