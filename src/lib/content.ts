// All game content and tuning. Values are a faithful port of the original
// Grok prototype (idle-stoner.grok.me) — change them deliberately, with play
// testing, not casually. New content added on top is marked NEW.

export interface GeneratorDef {
  id: string
  name: string
  blurb: string
  baseCost: number
  costScale: number
  baseRate: number
  unlockHigh: number
  /** Additive story content only (DESIGN § 9.4): the row exists once this
   * stage is reached (a real `lifeHigh` gate on top of `unlockHigh`).
   * Absent = available exactly as playtested, from the start of the life. */
  stage?: string
}

export interface JobDef {
  id: string
  name: string
  blurb: string
  baseCost: number
  costScale: number
  cashRate: number
  highRate: number
  unlockHigh: number
  /** See GeneratorDef.stage — real gates bind only new additive content. */
  stage?: string
}

export interface RitualDef {
  id: string
  name: string
  blurb: string
  maxLevel: number
  costs: number[]
  currency: 'nugs' | 'cash'
  unlockHigh: number
  /** See GeneratorDef.stage — real gates bind only new additive content. */
  stage?: string
}

export interface MoodDef {
  id: string
  name: string
  minHigh: number
  blurb: string
  /** NEW: a permanent lore line, revealed the first time the mood is reached. */
  revelation: string
}

export const TITLE = 'Couch Legend'
export const TAGLINE = 'Get higher. Unlock a life.'

export const GENERATORS: GeneratorDef[] = [
  { id: 'tray', name: 'Rolling Tray', blurb: 'A dented tin that knows the way. Starts the afternoon.', baseCost: 10, costScale: 1.14, baseRate: 0.1, unlockHigh: 0 },
  { id: 'piece', name: 'Beaker Piece', blurb: 'Glass that sings when it is warm. Reliable company.', baseCost: 80, costScale: 1.145, baseRate: 0.8, unlockHigh: 8 },
  { id: 'gravity', name: 'Gravity Bong', blurb: 'Physics does the work. You just hold the bottle.', baseCost: 620, costScale: 1.15, baseRate: 5.2, unlockHigh: 25 },
  // Arc-1 prologue (NEW, stage-gated additive content — DESIGN § 9.4).
  { id: 'pinch', name: "Cousin's Pinch", blurb: 'A little shared stash, replenished on the honor system.', baseCost: 780, costScale: 1.15, baseRate: 6.5, unlockHigh: 30, stage: 'cousins-couch' },
  { id: 'grinder', name: 'Borrowed Grinder', blurb: 'Came with the couch, allegedly. It lives on the crate now.', baseCost: 2400, costScale: 1.15, baseRate: 15, unlockHigh: 50, stage: 'cousins-couch' },
  { id: 'vape', name: 'Desktop Vape', blurb: 'A quiet machine that never asks questions.', baseCost: 4800, costScale: 1.15, baseRate: 32, unlockHigh: 70 },
  { id: 'volcano', name: 'Tabletop Volcano', blurb: 'Bags of weather. The living room has its own climate.', baseCost: 42e3, costScale: 1.15, baseRate: 180, unlockHigh: 180 },
  { id: 'closet', name: 'Closet Grow', blurb: 'A secret forest behind the winter coats.', baseCost: 38e4, costScale: 1.15, baseRate: 1100, unlockHigh: 450 },
  { id: 'farm', name: 'Indoor Farm', blurb: 'Whole rooms of green light. You forget what season it is.', baseCost: 36e5, costScale: 1.15, baseRate: 7200, unlockHigh: 1200 },
  { id: 'collective', name: 'The Collective', blurb: 'Friends of friends who also never leave. Shared inventory.', baseCost: 34e6, costScale: 1.155, baseRate: 48e3, unlockHigh: 3500 },
  { id: 'dispensary', name: 'Corner Dispensary', blurb: 'A storefront with a bell that sounds like a sigh.', baseCost: 32e7, costScale: 1.155, baseRate: 31e4, unlockHigh: 9e3 },
  { id: 'cloud', name: 'The Cloud', blurb: 'Subscription haze. Delivered. Recurring. Inevitable.', baseCost: 31e8, costScale: 1.16, baseRate: 21e5, unlockHigh: 25e3 },
  { id: 'orbit', name: 'Orbital Garden', blurb: 'Plants in zero-g. You are fairly sure this is still your apartment.', baseCost: 3e10, costScale: 1.16, baseRate: 15e6, unlockHigh: 7e4 },
  { id: 'myth', name: 'Mythic Canopy', blurb: 'A forest that grew from one good idea and never stopped.', baseCost: 29e10, costScale: 1.16, baseRate: 11e7, unlockHigh: 2e5 },
]

export const JOBS: JobDef[] = [
  { id: 'thinker', name: 'Unemployed Philosopher', blurb: 'You already had this job. Now it pays in change and theories.', baseCost: 8, costScale: 1.16, cashRate: 0.4, highRate: 0.02, unlockHigh: 4 },
  { id: 'pizza', name: 'Night Pizza Run', blurb: 'Keys were in the fridge. The car remembered the route.', baseCost: 90, costScale: 1.16, cashRate: 2.4, highRate: 0, unlockHigh: 12 },
  { id: 'guitar', name: 'Stairwell Guitar', blurb: 'Three chords. A hat. Strangers leave coins and compliments.', baseCost: 520, costScale: 1.17, cashRate: 12, highRate: 0.05, unlockHigh: 35 },
  // Arc-1 prologue (NEW, stage-gated additive content — DESIGN § 9.4).
  { id: 'shift', name: 'Corner Store Shift', blurb: 'Fluorescent hours. The till predicts your purchases with insulting accuracy.', baseCost: 700, costScale: 1.17, cashRate: 16, highRate: 0.03, unlockHigh: 45, stage: 'corner-store' },
  { id: 'napper', name: 'Professional Napper', blurb: 'You invoice for REM. Clients say the work is outstanding.', baseCost: 2800, costScale: 1.17, cashRate: 55, highRate: 0.15, unlockHigh: 90 },
  { id: 'historian', name: 'Couch Historian', blurb: 'You rate cushions for a newsletter with 12 devoted readers.', baseCost: 16e3, costScale: 1.17, cashRate: 240, highRate: 0.08, unlockHigh: 220 },
  { id: 'chemist', name: 'Snack Chemist', blurb: 'Flavor pairings no sober person would attempt. A small empire.', baseCost: 95e3, costScale: 1.18, cashRate: 1100, highRate: 0.2, unlockHigh: 550 },
  { id: 'narrator', name: 'Nature Doc Voice', blurb: 'You whisper about beetles. Networks pay for the gravitas.', baseCost: 58e4, costScale: 1.18, cashRate: 5200, highRate: 0.4, unlockHigh: 1400 },
  { id: 'lights', name: 'Light Show Tech', blurb: 'Lasers, fog, a folding chair. You are technically on the crew.', baseCost: 36e5, costScale: 1.18, cashRate: 24e3, highRate: 0.6, unlockHigh: 4e3 },
  { id: 'oracle', name: 'Breathwork Oracle', blurb: 'You teach inhaling. The waitlist is spiritual.', baseCost: 22e6, costScale: 1.19, cashRate: 11e4, highRate: 1.2, unlockHigh: 11e3 },
  { id: 'minister', name: 'Minister of Chill', blurb: 'A cabinet post. The nation is your living room.', baseCost: 14e7, costScale: 1.19, cashRate: 52e4, highRate: 2.5, unlockHigh: 3e4 },
  { id: 'envoy', name: 'Interstellar Envoy', blurb: 'You represent Earth to people who already get it.', baseCost: 9e8, costScale: 1.2, cashRate: 24e5, highRate: 6, unlockHigh: 85e3 },
  { id: 'legend', name: 'Couch Legend', blurb: 'The title was literal. You sit. History rearranges itself.', baseCost: 6e9, costScale: 1.2, cashRate: 12e6, highRate: 18, unlockHigh: 22e4 },
]

export const RITUALS: RitualDef[] = [
  { id: 'water', name: 'Hydration', blurb: 'A glass that refills itself. Buzz fades slower.', maxLevel: 8, costs: [25, 80, 250, 800, 2500, 8e3, 25e3, 8e4], currency: 'nugs', unlockHigh: 6 },
  { id: 'snacks', name: 'Snack Cache', blurb: 'Crisp, salt, chocolate. The afternoon stays put.', maxLevel: 8, costs: [60, 200, 700, 2200, 8e3, 28e3, 1e5, 36e4], currency: 'nugs', unlockHigh: 18 },
  { id: 'roommate', name: 'The Roommate', blurb: 'They take a hit for you. On a loop. Bless them.', maxLevel: 10, costs: [120, 400, 1400, 5e3, 18e3, 65e3, 24e4, 9e5, 34e5, 13e6], currency: 'nugs', unlockHigh: 30 },
  // Arc-1 prologue (NEW, stage-gated additive content — DESIGN § 9.4).
  { id: 'lighter', name: 'The Green Lighter', blurb: "The cousin's loaner, never returned. Every hit lands a little warmer.", maxLevel: 6, costs: [150, 600, 2400, 9600, 4e4, 16e4], currency: 'nugs', unlockHigh: 35, stage: 'cousins-couch' },
  { id: 'playlist', name: 'Infinite Playlist', blurb: 'A mix that knows when to get weird. Everything produces more.', maxLevel: 8, costs: [40, 180, 720, 3e3, 14e3, 62e3, 28e4, 13e5], currency: 'cash', unlockHigh: 40 },
  { id: 'lamp', name: 'Lava Lamp', blurb: 'Blobs rise. Buzz arrives without asking.', maxLevel: 8, costs: [200, 900, 4e3, 18e3, 82e3, 38e4, 18e5, 82e5], currency: 'nugs', unlockHigh: 60 },
  { id: 'curtains', name: 'Blackout Curtains', blurb: 'Time becomes optional. Offline sessions keep more of themselves.', maxLevel: 5, costs: [150, 800, 4500, 28e3, 18e4], currency: 'cash', unlockHigh: 80 },
  { id: 'plants', name: 'Houseplant Wall', blurb: 'They photosynthesize your good mood. Nug output climbs.', maxLevel: 8, costs: [500, 2400, 12e3, 6e4, 3e5, 15e5, 75e5, 38e6], currency: 'nugs', unlockHigh: 150 },
  { id: 'cushion', name: 'Meditation Cushion', blurb: 'You sit on purpose. Wake & Bake pays better.', maxLevel: 6, costs: [400, 2200, 14e3, 9e4, 6e5, 42e5], currency: 'cash', unlockHigh: 400 },
  { id: 'sunday', name: 'Sunday Forever', blurb: 'The weekend refused to end. Hit power grows lazy and huge.', maxLevel: 8, costs: [2e3, 12e3, 72e3, 44e4, 27e5, 17e6, 105e6, 65e7], currency: 'nugs', unlockHigh: 900 },
  { id: 'throne', name: 'Pillow Throne', blurb: 'A seat of office. Jobs pay like they mean it.', maxLevel: 6, costs: [8e3, 5e4, 32e4, 21e5, 14e6, 9e7], currency: 'cash', unlockHigh: 2500 },
]

export const MOODS: MoodDef[] = [
  { id: 'lucid', name: 'Lucid', minHigh: 0, blurb: 'The room is still a room.', revelation: 'Day zero. The couch introduces itself by first name.' },
  { id: 'curious', name: 'Curious', minHigh: 10, blurb: 'The ceiling has opinions.', revelation: 'The ceiling has opinions. You start taking minutes.' },
  { id: 'buzzed', name: 'Buzzed', minHigh: 40, blurb: 'Time is happening next door.', revelation: 'Time knocks and asks to borrow an hour. You tell it to keep it.' },
  { id: 'toasty', name: 'Toasty', minHigh: 120, blurb: 'You invent a sandwich with a name.', revelation: 'The sandwich has a name. The name has a subtitle. Both are correct.' },
  { id: 'baked', name: 'Baked', minHigh: 400, blurb: 'Thoughts arrive in 4K, then leave.', revelation: 'Thoughts arrive in 4K. You save them all as drafts.' },
  { id: 'orbital', name: 'Orbital', minHigh: 1500, blurb: 'The couch is in slight free-fall.', revelation: 'Gravity files a complaint. The cushion absorbs it.' },
  { id: 'galactic', name: 'Galactic', minHigh: 6e3, blurb: 'You are on excellent terms with the void.', revelation: 'The void texts "you up?". You send a photo of the lamp.' },
  { id: 'mythic', name: 'Mythic', minHigh: 25e3, blurb: 'History starts taking notes.', revelation: 'History takes notes in the margins of your nap.' },
  { id: 'legend', name: 'Couch Legend', minHigh: 1e5, blurb: 'The afternoon became a civilization.', revelation: 'The afternoon became a civilization. You are its calendar.' },
]

// --- the life story ------------------------------------------------------
// 18 stages in three arcs, keyed on `lifeHigh` and nothing else (DESIGN
// § 9). Thresholds are TUNED BY SIMULATION — fitted to the measured
// tuned-balanced curve (docs/sim/2026-08-20-life-story-balance.md § 4);
// change them only with fresh sim evidence inside the § 9.6 rails. Scene
// keys are the looks contract's asset-scene keys (2026-08-21 looks pass
// § 5). Beats are the permanent one-line chapter captions: stages 1–3
// verbatim from the delivered scene packages, the rest authored here from
// the looks contract's stage treatments.

export interface StageDef {
  id: string
  name: string
  /** 1 = Sparks · 2 = The Couch Era · 3 = The Legend. */
  arc: 1 | 2 | 3
  /** Stage begins when lifetime High reaches this. Monotonic; pinned by test. */
  minLifeHigh: number
  /** The one new pressure/emphasis this stage introduces (plateau design). */
  pressure: string
  /** Asset-scene key for the per-stage backdrop (STAGE_PRESENTATION). */
  scene: string
  /** Permanent one-line chapter caption — the stage-entry story beat. */
  beat: string
}

export const ARC_NAMES: Record<1 | 2 | 3, string> = {
  1: 'Sparks',
  2: 'The Couch Era',
  3: 'The Legend',
}

export const STAGES: StageDef[] = [
  { id: 'first-light', name: 'First Light', arc: 1, minLifeHigh: 0, pressure: 'the click itself', scene: 'parking-lot-dusk', beat: 'Before the legend, there was a wet couch, a first cigarette, and a job flyer the wind refused to keep.' },
  { id: 'corner-store', name: 'Corner Store Nights', arc: 1, minLifeHigh: 510, pressure: 'first idle income', scene: 'corner-store', beat: 'The couch squeezed into the stockroom. Fluorescent hours became a first paycheck.' }, // ~4 min
  { id: 'cousins-couch', name: "Somebody's Cousin's Couch", arc: 1, minLifeHigh: 1.7e3, pressure: 'first cash, the pivot to weed', scene: 'cousins-living-room', beat: 'One green lighter changed the temperature of the room — and the price of a good afternoon.' }, // ~15 min
  { id: 'the-couch', name: 'The Couch', arc: 2, minLifeHigh: 1.4e4, pressure: 'the apartment economy (tray, piece, first jobs)', scene: 'first-apartment', beat: 'A first apartment, a first proper tray, the first ridiculous paid errand. The couch has a home now.' }, // ~30 min
  { id: 'rituals-of-the-room', name: 'Rituals of the Room', arc: 2, minLifeHigh: 3.0e7, pressure: 'retention + automation (water, snacks, roommate)', scene: 'apartment-lived-in', beat: 'Water, snacks, a roommate, a playlist. The room becomes a small system that runs without you.' }, // ~1.4 h
  { id: 'long-sunday', name: 'The Long Sunday', arc: 2, minLifeHigh: 2.4e9, pressure: 'Wake & Bake becomes the rhythm', scene: 'sunday-light', beat: 'Work, smoke, come down, begin a better afternoon. The first visible rhythm of a life.' }, // ~3.6 h
  { id: 'green-thumbs', name: 'Green Thumbs', arc: 2, minLifeHigh: 1.6e10, pressure: 'grow scale (closet, plants)', scene: 'closet-forest', beat: 'A luminous forest grows behind the winter coats. You are a producer now.' }, // ~day 0.4
  { id: 'working-stiff', name: 'A Working Stiff, Technically', arc: 2, minLifeHigh: 5.5e10, pressure: 'the career ladder pays (napper → chemist)', scene: 'odd-jobs-wall', beat: 'Pizza runs, stairwell chords, professional naps. A colorful wall of improbable employment.' }, // ~day 0.9
  { id: 'the-operation', name: 'The Operation', arc: 2, minLifeHigh: 1.5e11, pressure: 'industrial grow (farm, collective)', scene: 'evidence-room', beat: 'Success attracted the wrong attention. One spectacular weekend, the couch saw the inside of an evidence room.' }, // ~day 1.8
  { id: 'local-legend', name: 'Local Legend', arc: 2, minLifeHigh: 3.1e11, pressure: 'the neighborhood knows (dispensary, throne)', scene: 'storefront', beat: 'Friends rebuilt the remains as a storefront. The couch sits in the window like a neighborhood monument.' }, // ~day 3
  { id: 'head-in-the-cloud', name: 'Head in the Cloud', arc: 2, minLifeHigh: 5.3e11, pressure: 'subscription scale (cloud, oracle)', scene: 'state-room', beat: 'Delivery platforms, strange remote work, accidental influence. An administration extends an invitation.' }, // ~day 4.5
  { id: 'garden-upstairs', name: 'The Garden Upstairs', arc: 2, minLifeHigh: 8.2e11, pressure: 'leaving the ground (orbit, envoy)', scene: 'lunar-lounge', beat: "An orbital garden and an envoy's badge carry the couch to a lunar lounge, Earth in the window." }, // ~day 6.2
  { id: 'mythic-canopy', name: 'Mythic Canopy', arc: 2, minLifeHigh: 1.2e12, pressure: 'the last authored tier of the couch era', scene: 'bioluminescent-canopy', beat: 'A bioluminescent forest grows around the couch. The operation has become folklore.' }, // ~day 8
  { id: 'the-civilization', name: 'The Civilization', arc: 3, minLifeHigh: 1.5e12, pressure: 'new content batch A (post-couch)', scene: 'afternoon-city', beat: 'Bright future lounges, gardens, absurd jobs. A private routine is becoming a culture.' }, // ~day 9.5
  { id: 'the-archive', name: 'The Archive', arc: 3, minLifeHigh: 1.7e12, pressure: 'new content batch B', scene: 'archive-halls', beat: 'A future museum keeps the nametag, the tray, the wristband. The couch is supposedly behind glass. You are still on it.' }, // ~day 10.7
  { id: 'the-long-now', name: 'The Long Now', arc: 3, minLifeHigh: 2.0e12, pressure: 'new content batch C', scene: 'long-now', beat: 'A calm future lounge. An afternoon, it turns out, can take several shapes without breaking.' }, // ~day 11.8
  { id: 'almost-everything', name: 'Almost Everything', arc: 3, minLifeHigh: 2.2e12, pressure: 'new content batch D', scene: 'almost-everything', beat: 'Remembered rooms overlap — nightlife, plants, jail bars, state rooms, the moon. One colorful dream.' }, // ~day 12.9
  { id: 'long-afternoon', name: 'The Long Afternoon', arc: 3, minLifeHigh: 2.5e12, pressure: 'endless: the prestige loop itself, forever', scene: 'long-afternoon', beat: 'The couch overlooks a cosmic sunset while the whole life quietly orbits it. The story ends. The afternoon does not.' }, // ~day 14
]

export function stageForLifeHigh(lifeHigh: number, stages: StageDef[] = STAGES): StageDef {
  let cur = stages[0]
  for (const st of stages) if (lifeHigh >= st.minLifeHigh) cur = st
  return cur
}

export function nextStage(lifeHigh: number): StageDef | null {
  for (const st of STAGES) if (lifeHigh < st.minLifeHigh) return st
  return null
}

/** The chapter turn: the stage entered between two lifeHigh readings, or
 * null. Multiple thresholds crossed at once (offline, import) collapse to
 * the FINAL stage — at most one turn, never a replay of every crossing. */
export function stageCrossed(prevLifeHigh: number, nextLifeHigh: number): StageDef | null {
  const before = stageForLifeHigh(prevLifeHigh)
  const after = stageForLifeHigh(nextLifeHigh)
  return after.id === before.id ? null : after
}

/** Availability of stage-gated (additive) content. Rows without a stage are
 * ungated; a row naming an unknown stage stays locked (fail closed — a pin
 * test keeps the branch unreachable). */
export function stageUnlocked(lifeHigh: number, stageId: string | undefined): boolean {
  if (!stageId) return true
  const st = STAGES.find(s => s.id === stageId)
  return st != null && lifeHigh >= st.minLifeHigh
}

/**
 * Era FRAMING for the content tables — which stage's scene and beats
 * reference each item. NOT an availability gate for the original 34 items:
 * they keep `high >= unlockHigh` as their only key, exactly as playtested
 * (DESIGN § 9.4 — real stage gates bind only additive content, whose rows
 * carry a `stage` field matching their framing here).
 */
export const STAGE_FRAMING: Record<string, string> = {
  // generators
  tray: 'the-couch', piece: 'the-couch', gravity: 'rituals-of-the-room',
  pinch: 'cousins-couch', grinder: 'cousins-couch',
  vape: 'long-sunday', volcano: 'long-sunday', closet: 'green-thumbs',
  farm: 'the-operation', collective: 'the-operation', dispensary: 'local-legend',
  cloud: 'head-in-the-cloud', orbit: 'garden-upstairs', myth: 'mythic-canopy',
  // jobs
  thinker: 'the-couch', pizza: 'the-couch', guitar: 'rituals-of-the-room',
  shift: 'corner-store',
  napper: 'working-stiff', historian: 'working-stiff', chemist: 'working-stiff',
  narrator: 'the-operation', lights: 'local-legend', oracle: 'head-in-the-cloud',
  minister: 'head-in-the-cloud', envoy: 'garden-upstairs', legend: 'mythic-canopy',
  // rituals
  water: 'the-couch', snacks: 'rituals-of-the-room', roommate: 'rituals-of-the-room',
  lighter: 'cousins-couch',
  playlist: 'rituals-of-the-room', lamp: 'long-sunday', curtains: 'long-sunday',
  plants: 'green-thumbs', cushion: 'long-sunday', sunday: 'local-legend',
  throne: 'local-legend',
}

export interface AchievementDef {
  id: string
  name: string
  blurb: string
  check: (s: AchievementState) => boolean
  nugMult?: number
  cashMult?: number
  buzzMult?: number
}

/** The slice of save state achievements are judged on. */
export interface AchievementState {
  totalHits: number
  peakHigh: number
  buzz: number
  nugs: number
  cash: number
  enlightenment: number
  playTime: number
  generators: Record<string, number>
  jobs: Record<string, number>
  rituals: Record<string, number>
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-hit', name: 'First Hit', blurb: 'The afternoon notices you.', check: s => s.totalHits >= 1 },
  { id: 'ceiling', name: 'Ceiling Expert', blurb: 'You have mapped every crack. They are all interesting.', check: s => s.totalHits >= 25, nugMult: 0.02 },
  { id: 'remote', name: 'Remote Missing', blurb: 'It will turn up in a shoe. Eventually.', check: s => s.totalHits >= 100 },
  { id: 'hits-1k', name: 'Muscle Memory', blurb: 'The hand knows. You are elsewhere.', check: s => s.totalHits >= 1e3, nugMult: 0.03 },
  { id: 'high-10', name: 'The Ceiling Has Layers', blurb: 'Depth perception files a complaint.', check: s => s.peakHigh >= 10 },
  { id: 'high-50', name: 'Time Is Soup', blurb: 'Clocks are a suggestion.', check: s => s.peakHigh >= 50, buzzMult: 0.04 },
  { id: 'high-200', name: 'Invented a Sandwich', blurb: 'It has a name. The name is a paragraph.', check: s => s.peakHigh >= 200 },
  { id: 'high-1k', name: 'Low Earth Orbit', blurb: 'The couch has a slight wobble. So does the planet.', check: s => s.peakHigh >= 1e3, nugMult: 0.04 },
  { id: 'high-10k', name: 'On Speaking Terms with Space', blurb: 'Space says hi back.', check: s => s.peakHigh >= 1e4, cashMult: 0.05 },
  { id: 'high-100k', name: 'Literal Legend', blurb: 'Someone writes it down. You are napping.', check: s => s.peakHigh >= 1e5, nugMult: 0.08, cashMult: 0.08 },
  { id: 'job-1', name: 'Got a Job', blurb: 'It involves sitting. You were overqualified.', check: s => Object.values(s.jobs).some(v => v > 0) },
  { id: 'job-forgot', name: 'Forgot You Had a Job', blurb: 'Payroll still clears. Philosophy continues.', check: s => sum(s.jobs) >= 15, cashMult: 0.03 },
  { id: 'job-career', name: 'A Whole Career', blurb: 'LinkedIn would not understand, and that is fine.', check: s => sum(s.jobs) >= 80, cashMult: 0.05 },
  { id: 'all-jobs', name: 'Fully Employed', blurb: 'Every title at once. The business card is a pamphlet.', check: s => JOBS.every(j => (s.jobs[j.id] ?? 0) > 0), cashMult: 0.1 },
  { id: 'gen-1', name: 'The Tray Knows', blurb: 'Idle begins. You can almost put the phone down.', check: s => Object.values(s.generators).some(v => v > 0) },
  { id: 'gen-25', name: 'A Small Operation', blurb: 'The living room is a facility now.', check: s => sum(s.generators) >= 25, nugMult: 0.03 },
  { id: 'gen-100', name: 'Supply Chain', blurb: 'You are the supply. You are also the chain.', check: s => sum(s.generators) >= 100, nugMult: 0.05 },
  { id: 'gen-cloud', name: 'Head in the Cloud', blurb: 'The subscription billed itself. You approved with a nod.', check: s => (s.generators.cloud ?? 0) >= 1 },
  { id: 'cash-1k', name: 'Pizza Money', blurb: 'Enough for two pies and a theory of mind.', check: s => s.cash >= 1e3 },
  { id: 'cash-1m', name: 'Liquid Afternoon', blurb: 'The bank called. You let it ring.', check: s => s.cash >= 1e6, cashMult: 0.04 },
  { id: 'nugs-1m', name: 'Green Ledger', blurb: 'The numbers got a zip code.', check: s => s.nugs >= 1e6 },
  { id: 'roommate', name: 'Delegation', blurb: 'Someone else clicked. You watched a documentary about coral.', check: s => (s.rituals.roommate ?? 0) >= 1 },
  { id: 'autopilot', name: 'Hands-Free Session', blurb: 'The afternoon runs itself. You are the board of directors.', check: s => (s.rituals.roommate ?? 0) >= 5, nugMult: 0.04 },
  { id: 'wake', name: 'Wake and Bake', blurb: 'You came down on purpose. Clarity stuck around.', check: s => s.enlightenment >= 1, buzzMult: 0.05 },
  { id: 'wake-10', name: 'Sunday Scholar', blurb: 'Ten mornings. Ten better afternoons.', check: s => s.enlightenment >= 10, nugMult: 0.06 },
  { id: 'play-1h', name: 'The Hour Folded', blurb: 'Sixty minutes, or one long blink.', check: s => s.playTime >= 3600 },
  { id: 'play-1d', name: 'Calendar Optional', blurb: 'A day of sitting. The couch issued a medal.', check: s => s.playTime >= 86400, nugMult: 0.05, cashMult: 0.05 },
  { id: 'buzz-50', name: 'Properly Toasted', blurb: 'The multiplier has opinions and they are good.', check: s => s.buzz >= 50 },
  { id: 'buzz-500', name: 'Haze Architecture', blurb: 'You live in the multiplier now.', check: s => s.buzz >= 500, buzzMult: 0.06 },
  { id: 'rituals-10', name: 'A Practice', blurb: 'Water, snacks, light, sound. A liturgy of staying.', check: s => sum(s.rituals) >= 10 },
  { id: 'all-rituals', name: 'House Blessed', blurb: 'Every ritual lit. The apartment hums in key.', check: s => RITUALS.every(r => (s.rituals[r.id] ?? 0) > 0), nugMult: 0.08 },
  { id: 'napper-job', name: 'Paid to Sleep', blurb: 'The dream had a timesheet.', check: s => (s.jobs.napper ?? 0) >= 1 },
  { id: 'minister', name: 'Cabinet of One', blurb: 'Policy is a playlist and a glass of water.', check: s => (s.jobs.minister ?? 0) >= 1, cashMult: 0.06 },
]

export const NEWS_LINES: string[] = [
  'The ceiling files a new report. It is glowing.',
  'You remember a snack from a previous decade.',
  'Time is happening in the other room. Let it.',
  'A houseplant leans in to hear the playlist.',
  'You almost got up. Then you had a better idea.',
  'The remote is in a shoe. The shoe is at peace.',
  'Someone on the internet is wrong. You let them be.',
  'A documentary about coral feels personally relevant.',
  'The lava lamp completes a thought you started in 2014.',
  'You name a sandwich. The name has a subtitle.',
  'Payroll cleared. You were asleep at the time.',
  'The couch issues a press release. It is proud of you.',
  'Gravity takes a personal day. You remain seated.',
  'A friend texts “you up”. You send a photo of the lamp.',
  'You invent a new way to hold a glass of water.',
  'The afternoon files for an extension. Granted.',
  'You consider standing. The committee tables it.',
  'A moth is doing jazz in the corner. Standing ovation.',
  'The fridge hums in B-flat. You hum along, eventually.',
  'You find the keys. They were in the fruit bowl. There is no fruit.',
  'Orbit is a state of mind and also, slightly, the couch.',
  'You write a manifesto. It is three words, all of them “yeah”.',
  'The playlist knows. It always knew.',
  'A career happens in the background, politely.',
  'Sunday refuses to clock out. You promote it.',
]

export const INTERJECTIONS = ['Yeah.', 'Nice.', 'Hold on.', 'Wait.', 'Okay.', 'There.', 'Mhm.', 'Whoa.']

export function moodFor(high: number): MoodDef {
  let mood = MOODS[0]
  for (const m of MOODS) if (high >= m.minHigh) mood = m
  return mood
}

export function nextMood(high: number): MoodDef | null {
  for (const m of MOODS) if (high < m.minHigh) return m
  return null
}
