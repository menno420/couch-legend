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
}

export interface RitualDef {
  id: string
  name: string
  blurb: string
  maxLevel: number
  costs: number[]
  currency: 'nugs' | 'cash'
  unlockHigh: number
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
