import type { ReactNode } from 'react'
import { Leaf, Briefcase, Sparkles, ScrollText } from 'lucide-react'
import { useGame, type BuyQty, type Tab } from '../lib/store'
import { GENERATORS, JOBS, RITUALS } from '../lib/content'
import { bulkCost, maxAffordable, milestoneMult } from '../lib/engine'
import { fmt, fmtRate } from '../lib/format'
import { Button, cx } from './ui'

const QTYS: BuyQty[] = [1, 10, 100, 'max']

export function QtyPicker() {
  const qty = useGame(s => s.buyQty)
  const setQty = useGame(s => s.setBuyQty)
  return (
    <div className="flex rounded-md border border-border bg-elevated p-0.5">
      {QTYS.map(q => (
        <button
          key={String(q)}
          type="button"
          onClick={() => setQty(q)}
          className={cx(
            'h-8 min-w-10 rounded-[6px] px-2.5 text-xs font-medium tabular-nums transition-colors duration-150',
            qty === q ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg',
          )}
        >
          {q === 'max' ? 'Max' : `×${q}`}
        </button>
      ))}
    </div>
  )
}

/** NEW: a subtle dot on tabs where something new is affordable. */
function useTabSignals(): Record<Tab, boolean> {
  return useGame(s => {
    const growReady = GENERATORS.some(g => s.high >= g.unlockHigh && s.nugs >= bulkCost(g.baseCost, g.costScale, s.generators[g.id] ?? 0, 1))
    const workReady = JOBS.some(j => s.high >= j.unlockHigh && s.cash >= bulkCost(j.baseCost, j.costScale, s.jobs[j.id] ?? 0, 1))
    const ritualReady = RITUALS.some(r => {
      if (s.high < r.unlockHigh) return false
      const level = s.rituals[r.id] ?? 0
      const cost = level >= r.maxLevel ? null : r.costs[level]
      if (cost == null) return false
      return (r.currency === 'nugs' ? s.nugs : s.cash) >= cost
    })
    // Encode as a string selector to keep zustand's shallow compare happy.
    return `${growReady ? 1 : 0}${workReady ? 1 : 0}${ritualReady ? 1 : 0}`
  }).split('').reduce((acc, v, i) => {
    const tabs: Tab[] = ['grow', 'work', 'rituals']
    acc[tabs[i]] = v === '1'
    return acc
  }, { grow: false, work: false, rituals: false, lore: false } as Record<Tab, boolean>)
}

export function TabBar() {
  const tab = useGame(s => s.tab)
  const setTab = useGame(s => s.setTab)
  const signals = useTabSignals()
  const tabs: { id: Tab; label: string }[] = [
    { id: 'grow', label: 'Grow' },
    { id: 'work', label: 'Work' },
    { id: 'rituals', label: 'Rituals' },
    { id: 'lore', label: 'Lore' },
  ]
  return (
    <div className="flex rounded-lg border border-border bg-surface p-1">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={cx(
            'relative h-11 flex-1 rounded-md text-sm font-medium transition-colors duration-150',
            tab === t.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg',
          )}
        >
          {t.label}
          {signals[t.id] && tab !== t.id ? (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" aria-label="Something affordable" />
          ) : null}
        </button>
      ))}
    </div>
  )
}

interface RowProps {
  name: string
  blurb: string
  owned: number
  meta: string
  cost: number
  canAfford: boolean
  locked: boolean
  maxed?: boolean
  currency?: 'nugs' | 'cash'
  onBuy: () => void
}

function ShopRow({ name, blurb, owned, meta, cost, canAfford, locked, maxed, currency = 'nugs', onBuy }: RowProps) {
  return (
    <div className={cx('flex items-stretch gap-3 rounded-lg border border-border bg-elevated p-3', locked && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium text-fg">{name}</p>
          <p className="shrink-0 text-xs tabular-nums text-muted">{owned > 0 ? `×${fmt(owned, 0)}` : meta}</p>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{blurb}</p>
        {owned > 0 ? <p className="mt-1 text-xs tabular-nums text-subtle">{meta}</p> : null}
      </div>
      <Button
        size="sm"
        variant={canAfford ? 'primary' : 'secondary'}
        disabled={locked || maxed || !canAfford}
        onClick={onBuy}
        className="h-11 min-w-[5.5rem] shrink-0 flex-col gap-0 rounded-md px-3"
      >
        {maxed ? (
          <span>Done</span>
        ) : (
          <>
            <span className="text-sm leading-none tabular-nums">{fmt(cost)}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80">{currency}</span>
          </>
        )}
      </Button>
    </div>
  )
}

function Section({ icon, title, hint, qty, children }: { icon: ReactNode; title: string; hint: string; qty?: boolean; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-fg">
            <span className="text-accent">{icon}</span>
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        {qty ? <QtyPicker /> : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function GrowTab() {
  const high = useGame(s => s.high)
  const nugs = useGame(s => s.nugs)
  const generators = useGame(s => s.generators)
  const buyQty = useGame(s => s.buyQty)
  const buy = useGame(s => s.buyGenerator)
  return (
    <Section icon={<Leaf className="size-4" aria-hidden />} title="Grow" hint="Idle nugs. Buy them once, forget them forever." qty>
      {GENERATORS.map(g => {
        const locked = high < g.unlockHigh
        const deepLocked = locked && high < g.unlockHigh * 0.45
        const owned = generators[g.id] ?? 0
        const qty = buyQty === 'max' ? Math.max(1, maxAffordable(g.baseCost, g.costScale, owned, nugs)) : buyQty
        const cost = bulkCost(g.baseCost, g.costScale, owned, qty)
        const rate = g.baseRate * owned * milestoneMult(owned)
        return (
          <ShopRow
            key={g.id}
            name={deepLocked ? '???' : g.name}
            blurb={locked ? (deepLocked ? 'Something green this way comes.' : `Unlocks at High ${fmt(g.unlockHigh)}`) : g.blurb}
            owned={owned}
            meta={owned > 0 ? fmtRate(rate) : 'idle nugs'}
            cost={cost}
            canAfford={!locked && nugs >= cost}
            locked={locked}
            onBuy={() => buy(g.id)}
          />
        )
      })}
    </Section>
  )
}

export function WorkTab() {
  const high = useGame(s => s.high)
  const cash = useGame(s => s.cash)
  const jobs = useGame(s => s.jobs)
  const buyQty = useGame(s => s.buyQty)
  const buy = useGame(s => s.buyJob)
  return (
    <Section icon={<Briefcase className="size-4" aria-hidden />} title="Work" hint="Jobs that happen while you stare at the lamp." qty>
      {JOBS.map(j => {
        const locked = high < j.unlockHigh
        const deepLocked = locked && high < j.unlockHigh * 0.45
        const owned = jobs[j.id] ?? 0
        const qty = buyQty === 'max' ? Math.max(1, maxAffordable(j.baseCost, j.costScale, owned, cash)) : buyQty
        const cost = bulkCost(j.baseCost, j.costScale, owned, qty)
        const rate = j.cashRate * owned * milestoneMult(owned)
        return (
          <ShopRow
            key={j.id}
            name={deepLocked ? '???' : j.name}
            blurb={locked ? (deepLocked ? 'A career, probably. Later.' : `Unlocks at High ${fmt(j.unlockHigh)}`) : j.blurb}
            owned={owned}
            meta={owned > 0 ? `${fmtRate(rate)} cash` : 'idle cash'}
            cost={cost}
            canAfford={!locked && cash >= cost}
            locked={locked}
            currency="cash"
            onBuy={() => buy(j.id)}
          />
        )
      })}
    </Section>
  )
}

export function RitualsTab() {
  const high = useGame(s => s.high)
  const nugs = useGame(s => s.nugs)
  const cash = useGame(s => s.cash)
  const rituals = useGame(s => s.rituals)
  const buy = useGame(s => s.buyRitual)
  return (
    <Section icon={<Sparkles className="size-4" aria-hidden />} title="Rituals" hint="Set-and-forget. This is the idle part.">
      {RITUALS.map(r => {
        const locked = high < r.unlockHigh
        const deepLocked = locked && high < r.unlockHigh * 0.45
        const level = rituals[r.id] ?? 0
        const cost = level >= r.maxLevel ? null : r.costs[level]
        const maxed = cost == null
        const funds = r.currency === 'nugs' ? nugs : cash
        return (
          <ShopRow
            key={r.id}
            name={deepLocked ? '???' : r.name}
            blurb={locked ? (deepLocked ? 'A habit waiting to happen.' : `Unlocks at High ${fmt(r.unlockHigh)}`) : r.blurb}
            owned={level}
            meta={maxed ? 'complete' : `lv ${level}/${r.maxLevel}`}
            cost={cost ?? 0}
            canAfford={!locked && !maxed && funds >= (cost ?? Infinity)}
            locked={locked}
            maxed={maxed}
            currency={r.currency}
            onBuy={() => buy(r.id)}
          />
        )
      })}
    </Section>
  )
}

export { ScrollText }
