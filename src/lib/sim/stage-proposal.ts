// The proposed life-story stage table — the phase-2 design artifact, in
// content-table form so the implementation session can lift it into
// src/lib/content.ts nearly verbatim. Names and beats are WORKING TITLES for
// structure only; final flavor text is content work and out of this session's
// scope. Thresholds are TUNED BY SIMULATION — see docs/sim/ for the evidence
// behind every number, and tests/sim.test.ts for the invariants.
//
// The axis: `lifeHigh` — every point of High ever earned, across every
// Wake & Bake. It never decreases and never resets: the story is the life,
// prestige is one afternoon of it.

export interface StageDef {
  id: string
  name: string
  /** 1 = Sparks (before the couch) · 2 = The Couch Era · 3 = The Legend. */
  arc: 1 | 2 | 3
  /** Stage begins when lifetime High reaches this. Monotonic; pinned by test. */
  minLifeHigh: number
  /** The one new pressure/emphasis this stage introduces (plateau design). */
  pressure: string
  /** Scene key for the per-stage backdrop (art produced later). */
  scene: string
}

// Thresholds fitted to the measured tuned-balanced lifeHigh curve at the
// target cadence (`pnpm sim fit`): arc 1 inside the first half hour, arc 2
// riding the curve's fast first day then ~every 1–2 days, arc 3 daily beats
// landing stage 18 at ~day 14. The curve is bi-phasic (explosive first day,
// then ~×1.1–1.2/day), so thresholds are NOT a neat geometric ladder — they
// follow the economy players actually experience. Reach-day comments are the
// fitted targets for tuned balanced play.
export const PROPOSED_STAGES: StageDef[] = [
  { id: 'first-light', name: 'First Light', arc: 1, minLifeHigh: 0, pressure: 'the click itself', scene: 'parking-lot-dusk' },
  { id: 'corner-store', name: 'Corner Store Nights', arc: 1, minLifeHigh: 510, pressure: 'first idle income', scene: 'corner-store' }, // ~4 min
  { id: 'cousins-couch', name: "Somebody's Cousin's Couch", arc: 1, minLifeHigh: 1.7e3, pressure: 'first cash, the pivot to weed', scene: 'cousins-living-room' }, // ~15 min
  { id: 'the-couch', name: 'The Couch', arc: 2, minLifeHigh: 1.4e4, pressure: 'the apartment economy (tray, piece, first jobs)', scene: 'first-apartment' }, // ~30 min
  { id: 'rituals-of-the-room', name: 'Rituals of the Room', arc: 2, minLifeHigh: 3.0e7, pressure: 'retention + automation (water, snacks, roommate)', scene: 'apartment-lived-in' }, // ~1.4 h
  { id: 'long-sunday', name: 'The Long Sunday', arc: 2, minLifeHigh: 2.4e9, pressure: 'Wake & Bake becomes the rhythm', scene: 'sunday-light' }, // ~3.6 h
  { id: 'green-thumbs', name: 'Green Thumbs', arc: 2, minLifeHigh: 1.6e10, pressure: 'grow scale (closet, plants)', scene: 'closet-forest' }, // ~day 0.4
  { id: 'working-stiff', name: 'A Working Stiff, Technically', arc: 2, minLifeHigh: 5.5e10, pressure: 'the career ladder pays (napper → chemist)', scene: 'odd-jobs-wall' }, // ~day 0.9
  { id: 'the-operation', name: 'The Operation', arc: 2, minLifeHigh: 1.5e11, pressure: 'industrial grow (farm, collective)', scene: 'green-rooms' }, // ~day 1.8
  { id: 'local-legend', name: 'Local Legend', arc: 2, minLifeHigh: 3.1e11, pressure: 'the neighborhood knows (dispensary, throne)', scene: 'storefront' }, // ~day 3
  { id: 'head-in-the-cloud', name: 'Head in the Cloud', arc: 2, minLifeHigh: 5.3e11, pressure: 'subscription scale (cloud, oracle)', scene: 'server-haze' }, // ~day 4.5
  { id: 'garden-upstairs', name: 'The Garden Upstairs', arc: 2, minLifeHigh: 8.2e11, pressure: 'leaving the ground (orbit, envoy)', scene: 'orbital-window' }, // ~day 6.2
  { id: 'mythic-canopy', name: 'Mythic Canopy', arc: 2, minLifeHigh: 1.2e12, pressure: 'the last authored tier of the couch era', scene: 'canopy' }, // ~day 8
  { id: 'the-civilization', name: 'The Civilization', arc: 3, minLifeHigh: 1.5e12, pressure: 'new content batch A (post-couch)', scene: 'afternoon-city' }, // ~day 9.5
  { id: 'the-archive', name: 'The Archive', arc: 3, minLifeHigh: 1.7e12, pressure: 'new content batch B', scene: 'archive-halls' }, // ~day 10.7
  { id: 'the-long-now', name: 'The Long Now', arc: 3, minLifeHigh: 2.0e12, pressure: 'new content batch C', scene: 'long-now' }, // ~day 11.8
  { id: 'almost-everything', name: 'Almost Everything', arc: 3, minLifeHigh: 2.2e12, pressure: 'new content batch D', scene: 'almost-everything' }, // ~day 12.9
  { id: 'long-afternoon', name: 'The Long Afternoon', arc: 3, minLifeHigh: 2.5e12, pressure: 'endless: the prestige loop itself, forever', scene: 'the-long-afternoon' }, // ~day 14
]

export function stageForLifeHigh(lifeHigh: number, stages: StageDef[] = PROPOSED_STAGES): StageDef {
  let cur = stages[0]
  for (const st of stages) if (lifeHigh >= st.minLifeHigh) cur = st
  return cur
}

/**
 * Era FRAMING for the EXISTING content tables — which stage's scene and
 * beats reference each item. NOT an availability gate: existing items keep
 * `high >= unlockHigh` as their only key, exactly as playtested (DESIGN
 * § 9.4 — real stage gates exist only for not-yet-authored additive content:
 * the arc-1 prologue and the arc-3 batches). The simulator therefore
 * correctly models the proposed system by simulating today's availability.
 */
export const PROPOSED_STAGE_FRAMING: Record<string, string> = {
  // generators
  tray: 'the-couch', piece: 'the-couch', gravity: 'rituals-of-the-room',
  vape: 'long-sunday', volcano: 'long-sunday', closet: 'green-thumbs',
  farm: 'the-operation', collective: 'the-operation', dispensary: 'local-legend',
  cloud: 'head-in-the-cloud', orbit: 'garden-upstairs', myth: 'mythic-canopy',
  // jobs
  thinker: 'the-couch', pizza: 'the-couch', guitar: 'rituals-of-the-room',
  napper: 'working-stiff', historian: 'working-stiff', chemist: 'working-stiff',
  narrator: 'the-operation', lights: 'local-legend', oracle: 'head-in-the-cloud',
  minister: 'head-in-the-cloud', envoy: 'garden-upstairs', legend: 'mythic-canopy',
  // rituals
  water: 'the-couch', snacks: 'rituals-of-the-room', roommate: 'rituals-of-the-room',
  playlist: 'rituals-of-the-room', lamp: 'long-sunday', curtains: 'long-sunday',
  plants: 'green-thumbs', cushion: 'long-sunday', sunday: 'local-legend',
  throne: 'local-legend',
}
