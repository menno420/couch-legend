import { Sofa, Check } from 'lucide-react'
import { useGame } from '../lib/store'
import {
  ARC_NAMES, KEEPSAKES, SLOT_STAGES, STAGES, nextStage,
  stageForLifeHigh, type KeepsakeDef, type KeepsakeEffect,
} from '../lib/content'
import { isSuperseded, keepsakeEffects, keepsakeSlots } from '../lib/engine'
import { pickSave } from '../lib/save'
import { fmt } from '../lib/format'
import { Button, cx } from './ui'

/** Plain language for one effect. The NUMBER lives in the content table and
 * is read from it here — the copy never restates a constant of its own. */
export function describeEffect(e: KeepsakeEffect): string {
  switch (e.kind) {
    case 'work-nugs': return `Your jobs bring nugs home too — ${Math.round(e.share * 100)}% of what they earn in cash, up to ${timesTheShelf(e.ceiling, 'the garden grows')}.`
    case 'grow-cash': return `Your plants pay cash too — ${Math.round(e.share * 100)}% of what they grow in nugs, up to ${timesTheShelf(e.ceiling, 'your jobs earn')}.`
    case 'buzz-floor': return `Buzz never sinks below ${Math.round(e.share * 100)}% of the best you have felt this afternoon.`
    case 'return-gift': return `The first hit after you come back pays ${e.seconds} seconds of everything you were making.`
    case 'offline-uncap': return `Away time never runs out — but it all earns at ${Math.round(e.efficiency * 100)}%.`
    case 'hit-echo': return `Every ${ordinal(e.everyNth)} hit lands twice.`
    case 'milestone-early': return `${e.target === 'grow' ? 'Grow' : 'Work'} rows double every ${25 - e.units} owned instead of every 25.`
    case 'auto-buy': return `The cheapest ${e.target === 'grow' ? 'Grow' : 'Work'} row buys itself every ${e.everySeconds} seconds — but only out of spare change, never more than a quarter of what you are holding.`
    case 'clarity-yield': return `Wake & Bake pays ${Math.round((e.value - 1) * 100)}% more Clarity.`
    case 'shelf': return `Takes one place on the couch and makes ${e.slots}. One more than it costs.`
  }
}

const ordinal = (n: number) => (n === 2 ? 'second' : n === 3 ? 'third' : n === 4 ? 'fourth' : n === 5 ? 'fifth' : `${n}th`)

/** "as much again as the garden grows" · "three times what your jobs earn"
 * — the ceiling in words, read from the content table like every other
 * number here. */
const timesTheShelf = (ceiling: number, shelf: string) =>
  ceiling === 1 ? `as much again as ${shelf}`
    : ceiling === 2 ? `twice what ${shelf}`
      : ceiling === 3 ? `three times what ${shelf}`
        : `${ceiling}× what ${shelf}`

function chapterOf(k: KeepsakeDef): { index: number; name: string; arc: 1 | 2 | 3 } | null {
  const i = STAGES.findIndex(s => s.id === k.stage)
  return i < 0 ? null : { index: i + 1, name: STAGES[i].name, arc: STAGES[i].arc }
}

export function CouchTab() {
  const save = useGame()
  const toggle = save.toggleKeepsake
  const state = pickSave(save)
  const mods = keepsakeEffects(state)
  const owned = KEEPSAKES.filter(k => save.keepsakes.includes(k.id))
  const free = Math.max(0, mods.slots - save.equipped.length)
  const stage = stageForLifeHigh(save.lifeHigh)
  const upcoming = nextStage(save.lifeHigh)
  const nextSlotStage = SLOT_STAGES
    .map(id => STAGES.find(s => s.id === id))
    .find(s => s != null && save.lifeHigh < s.minLifeHigh)

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-0.015em] text-fg">
        <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-rust/10 text-rust">
          <Sofa className="size-4" aria-hidden />
        </span>
        The Couch
      </h2>
      <p className="mt-1 text-sm text-muted">
        Every chapter leaves something behind. Put what you like on the couch — it is free to change your mind,
        and Wake &amp; Bake never takes any of it.
      </p>

      <div className="surface-card mt-4 rounded-[14px] px-3 py-3" role="status" aria-live="polite">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-rust">Room on the couch</p>
        <p className="mt-0.5 text-sm text-fg tabular-nums">
          {save.equipped.length} of {mods.slots} places used
          {free > 0 ? <span className="text-accent"> · {free} free</span> : null}
        </p>
        <p className="mt-1 text-xs text-muted">
          {nextSlotStage
            ? <>More room in <span className="text-story">{nextSlotStage.name}</span>, at lifetime High {fmt(nextSlotStage.minLifeHigh)}.</>
            : 'The couch has all the room it will ever have.'}
        </p>
      </div>

      {owned.length === 0 ? (
        <div className="surface-card surface-card-muted mt-3 rounded-[14px] px-3 py-4">
          <p className="text-sm text-fg">The couch is bare.</p>
          <p className="mt-1 text-sm text-muted">
            {upcoming
              ? <>Chapter {STAGES.findIndex(s => s.id === upcoming.id) + 1}, <span className="text-story">{upcoming.name}</span>, will leave the first thing on it.</>
              : <>Keep going — the chapters leave things here.</>}
          </p>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-col gap-2">
        {owned.map(k => {
          const on = save.equipped.includes(k.id)
          const dim = on && isSuperseded(k.id, mods)
          const ch = chapterOf(k)
          // Capacity is judged on the CANDIDATE arrangement, exactly as
          // `equipKeepsake` judges it — otherwise the Accession Card, which
          // takes one place and grants two, reads as blocked on a full couch
          // and the player is made to remove something first for no reason.
          // (Codex CL#19 R2, P2.)
          const candidate = [...save.equipped, k.id]
          const blocked = !on && candidate.length > keepsakeSlots({ lifeHigh: save.lifeHigh, equipped: candidate })
          return (
            <li
              key={k.id}
              className={cx(
                'surface-card rounded-[14px] p-3 transition-[border-color,box-shadow] duration-200',
                on && !dim && 'shop-ready',
                on && dim && 'surface-card-muted',
                !on && 'surface-card-muted',
              )}
            >
              <div className="flex items-stretch gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p className={cx('font-display font-medium', on && !dim ? 'text-rust' : 'text-muted')}>{k.name}</p>
                    {ch ? (
                      <p className="shrink-0 text-xs uppercase tracking-[0.14em] text-subtle">
                        {String(ch.index).padStart(2, '0')} · {ARC_NAMES[ch.arc]}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm italic text-muted">{k.blurb}</p>
                  <p className={cx('mt-1 text-sm', on && !dim ? 'text-fg' : 'text-muted')}>{describeEffect(k.effect)}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {dim
                      ? 'Something else on the couch already does this better — its place is going spare.'
                      : on
                        ? <>Watch it work: {k.surface}.</>
                        : blocked
                          ? 'No room. Take something off first.'
                          : <>Would do this: {k.surface}.</>}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={on ? 'secondary' : 'primary'}
                  disabled={blocked}
                  onClick={() => toggle(k.id)}
                  aria-pressed={on}
                  className="h-11 min-w-[5.5rem] shrink-0 flex-col gap-0 rounded-[11px] px-3"
                >
                  {on ? (
                    <>
                      <Check className="size-4" aria-hidden />
                      <span className="text-xs uppercase tracking-[0.08em] opacity-85">On it</span>
                    </>
                  ) : (
                    <span className="text-sm leading-none">Put it on</span>
                  )}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {owned.length > 0 ? (
        <p className="mt-3 text-xs text-subtle">
          {owned.length} of {KEEPSAKES.length} chapters have left something.
          {' '}Nothing here can be missed and nothing needs completing — a chapter you reach leaves its keepsake,
          and that is the only way any of them arrive. Chapter {String(STAGES.findIndex(s => s.id === stage.id) + 1).padStart(2, '0')} is where you are now.
        </p>
      ) : null}
    </div>
  )
}
