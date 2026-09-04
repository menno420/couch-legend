import type { ReactNode } from 'react'
import { Leaf, Briefcase, Sparkles, ScrollText, Sofa } from 'lucide-react'
import { useGame, type BuyQty, type Tab } from '../lib/store'
import { GENERATORS, JOBS, RITUALS, stageUnlocked } from '../lib/content'
import { bulkCost, generatorOutput, jobCashOutput, keepsakeEffects, keepsakeSlots, maxAffordable } from '../lib/engine'
import { fmt, fmtRate } from '../lib/format'
import {
  generatorPurchaseImpact, jobPurchaseImpact, ritualPurchaseImpact,
} from '../lib/purchase-impact'
import { formatPurchaseImpact } from '../lib/purchase-impact-format'
import { isUnlockNameRevealed } from '../lib/progress'
import { Button, cx } from './ui'

const QTYS: BuyQty[] = [1, 10, 100, 'max']

export function QtyPicker() {
  const qty = useGame(s => s.buyQty)
  const setQty = useGame(s => s.setBuyQty)
  return (
    <div className="surface-card interactive-frame flex rounded-[11px] p-0.5">
      {QTYS.map(q => (
        <button
          key={String(q)}
          type="button"
          onClick={() => setQty(q)}
          className={cx(
            'h-8 min-w-10 rounded-[8px] px-2.5 text-xs font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 focus-visible:ring-offset-1 focus-visible:ring-offset-elevated',
            qty === q ? 'bg-accent text-accent-fg shadow-sm' : 'text-muted hover:bg-surface hover:text-fg',
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
    const growReady = GENERATORS.some(g => s.high >= g.unlockHigh && stageUnlocked(s.lifeHigh, g.stage) && s.nugs >= bulkCost(g.baseCost, g.costScale, s.generators[g.id] ?? 0, 1))
    const workReady = JOBS.some(j => s.high >= j.unlockHigh && stageUnlocked(s.lifeHigh, j.stage) && s.cash >= bulkCost(j.baseCost, j.costScale, s.jobs[j.id] ?? 0, 1))
    const couchReady = s.keepsakes.length > s.equipped.length
      && s.equipped.length < keepsakeSlots({ lifeHigh: s.lifeHigh, equipped: s.equipped })
    const ritualReady = RITUALS.some(r => {
      if (s.high < r.unlockHigh || !stageUnlocked(s.lifeHigh, r.stage)) return false
      const level = s.rituals[r.id] ?? 0
      const cost = level >= r.maxLevel ? null : r.costs[level]
      if (cost == null) return false
      return (r.currency === 'nugs' ? s.nugs : s.cash) >= cost
    })
    // Encode as a string selector to keep zustand's shallow compare happy.
    return `${growReady ? 1 : 0}${workReady ? 1 : 0}${ritualReady ? 1 : 0}${couchReady ? 1 : 0}`
  }).split('').reduce((acc, v, i) => {
    const tabs: Tab[] = ['grow', 'work', 'rituals', 'couch']
    acc[tabs[i]] = v === '1'
    return acc
  }, { grow: false, work: false, rituals: false, couch: false, lore: false } as Record<Tab, boolean>)
}

export function TabBar() {
  const tab = useGame(s => s.tab)
  const setTab = useGame(s => s.setTab)
  const signals = useTabSignals()
  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'grow', label: 'Grow', icon: <Leaf className="size-4" aria-hidden /> },
    { id: 'work', label: 'Work', icon: <Briefcase className="size-4" aria-hidden /> },
    { id: 'rituals', label: 'Rituals', icon: <Sparkles className="size-4" aria-hidden /> },
    { id: 'couch', label: 'Couch', icon: <Sofa className="size-4" aria-hidden /> },
    { id: 'lore', label: 'Chronicle', icon: <ScrollText className="size-4" aria-hidden /> },
  ]
  return (
    <nav className="tab-rail interactive-frame flex rounded-[16px] border bg-surface/95 p-1" aria-label="Game sections">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
          className={cx(
            'relative flex h-13 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] px-1 text-xs font-medium transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/90 focus-visible:ring-offset-1 focus-visible:ring-offset-surface sm:h-11 sm:flex-row sm:gap-1.5 sm:text-sm',
            tab === t.id ? 'bg-accent text-accent-fg shadow-[0_6px_18px_color-mix(in_oklab,var(--color-accent)_18%,transparent)]' : 'text-muted hover:bg-elevated hover:text-fg',
          )}
        >
          {t.icon}
          {t.label}
          {signals[t.id] && tab !== t.id ? (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-accent text-xs font-semibold leading-none text-accent-fg">
              <span aria-hidden>+</span>
              <span className="sr-only">Something affordable</span>
            </span>
          ) : null}
        </button>
      ))}
    </nav>
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
  impact?: string
  emptySelection?: boolean
  currency?: 'nugs' | 'cash'
  onBuy: () => void
}

function ShopRow({
  name, blurb, owned, meta, cost, canAfford, locked, maxed, impact,
  emptySelection, currency = 'nugs', onBuy,
}: RowProps) {
  return (
    <div className={cx('surface-card flex items-stretch gap-3 rounded-[14px] p-3 transition-[border-color,box-shadow] duration-200', canAfford && !locked && !maxed && 'shop-ready', locked && 'surface-card-muted')}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cx('truncate font-medium', locked ? 'text-muted' : 'text-fg')}>{name}</p>
          <p className="shrink-0 text-xs tabular-nums text-muted">{owned > 0 ? `×${fmt(owned, 0)}` : meta}</p>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{blurb}</p>
        {owned > 0 ? <p className="mt-1 text-xs tabular-nums text-subtle">{meta}</p> : null}
        {impact ? (
          <p className="mt-1 min-h-8 text-xs leading-4 tabular-nums text-subtle">
            {impact}
          </p>
        ) : null}
      </div>
      <Button
        size="sm"
        variant={canAfford ? 'primary' : 'secondary'}
        disabled={locked || maxed || !canAfford}
        onClick={onBuy}
        className="h-11 min-w-[5.5rem] shrink-0 flex-col gap-0 rounded-[11px] px-3"
      >
        {maxed ? (
          <span>Done</span>
        ) : emptySelection ? (
          <>
            <span className="text-sm leading-none">None</span>
            <span className="text-xs uppercase tracking-[0.08em] opacity-85">affordable</span>
          </>
        ) : (
          <>
            <span className="text-sm leading-none tabular-nums">{fmt(cost)}</span>
            <span className="text-xs uppercase tracking-[0.08em] opacity-85">{currency}</span>
          </>
        )}
      </Button>
    </div>
  )
}

function Section({ icon, title, hint, qty, children }: { icon: ReactNode; title: string; hint: string; qty?: boolean; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-0.015em] text-fg">
            <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-accent/10 text-accent">{icon}</span>
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
  const save = useGame()
  const { high, lifeHigh, nugs, generators, buyQty } = save
  const buy = save.buyGenerator
  const step = keepsakeEffects(save).growMilestoneStep
  return (
    <Section icon={<Leaf className="size-4" aria-hidden />} title="Grow" hint="Idle nugs. Buy them once, forget them forever." qty>
      {GENERATORS.filter(g => stageUnlocked(lifeHigh, g.stage)).map(g => {
        const locked = high < g.unlockHigh
        const deepLocked = locked && !isUnlockNameRevealed(high, g.unlockHigh)
        const owned = generators[g.id] ?? 0
        const fallbackQty = buyQty === 'max' ? Math.max(1, maxAffordable(g.baseCost, g.costScale, owned, nugs)) : buyQty
        const impact = generatorPurchaseImpact(save, g.id, buyQty)
        const cost = impact?.cost ?? bulkCost(g.baseCost, g.costScale, owned, fallbackQty)
        const rate = generatorOutput(g, owned, undefined, step)
        return (
          <ShopRow
            key={g.id}
            name={deepLocked ? '???' : g.name}
            blurb={locked ? (deepLocked ? 'Something green this way comes.' : `Unlocks at High ${fmt(g.unlockHigh)}`) : g.blurb}
            owned={owned}
            meta={owned > 0 ? fmtRate(rate) : 'idle nugs'}
            cost={cost}
            canAfford={!locked && (impact?.affordable ?? nugs >= cost)}
            locked={locked}
            impact={impact ? formatPurchaseImpact(impact) : undefined}
            emptySelection={impact?.kind === 'empty-max'}
            onBuy={() => buy(g.id)}
          />
        )
      })}
    </Section>
  )
}

export function WorkTab() {
  const save = useGame()
  const { high, lifeHigh, cash, jobs, buyQty } = save
  const buy = save.buyJob
  const step = keepsakeEffects(save).workMilestoneStep
  return (
    <Section icon={<Briefcase className="size-4" aria-hidden />} title="Work" hint="Jobs that happen while you stare at the lamp." qty>
      {JOBS.filter(j => stageUnlocked(lifeHigh, j.stage)).map(j => {
        const locked = high < j.unlockHigh
        const deepLocked = locked && !isUnlockNameRevealed(high, j.unlockHigh)
        const owned = jobs[j.id] ?? 0
        const fallbackQty = buyQty === 'max' ? Math.max(1, maxAffordable(j.baseCost, j.costScale, owned, cash)) : buyQty
        const impact = jobPurchaseImpact(save, j.id, buyQty)
        const cost = impact?.cost ?? bulkCost(j.baseCost, j.costScale, owned, fallbackQty)
        const rate = jobCashOutput(j, owned, undefined, step)
        return (
          <ShopRow
            key={j.id}
            name={deepLocked ? '???' : j.name}
            blurb={locked ? (deepLocked ? 'A career, probably. Later.' : `Unlocks at High ${fmt(j.unlockHigh)}`) : j.blurb}
            owned={owned}
            meta={owned > 0 ? `${fmtRate(rate)} cash` : 'idle cash'}
            cost={cost}
            canAfford={!locked && (impact?.affordable ?? cash >= cost)}
            locked={locked}
            impact={impact ? formatPurchaseImpact(impact) : undefined}
            emptySelection={impact?.kind === 'empty-max'}
            currency="cash"
            onBuy={() => buy(j.id)}
          />
        )
      })}
    </Section>
  )
}

export function RitualsTab() {
  const save = useGame()
  const { high, lifeHigh, nugs, cash, rituals } = save
  const buy = save.buyRitual
  return (
    <Section icon={<Sparkles className="size-4" aria-hidden />} title="Rituals" hint="Set-and-forget. This is the idle part.">
      {RITUALS.filter(r => stageUnlocked(lifeHigh, r.stage)).map(r => {
        const locked = high < r.unlockHigh
        const deepLocked = locked && !isUnlockNameRevealed(high, r.unlockHigh)
        const level = rituals[r.id] ?? 0
        const cost = level >= r.maxLevel ? null : r.costs[level]
        const maxed = cost == null
        const funds = r.currency === 'nugs' ? nugs : cash
        const impact = ritualPurchaseImpact(save, r.id)
        return (
          <ShopRow
            key={r.id}
            name={deepLocked ? '???' : r.name}
            blurb={locked ? (deepLocked ? 'A habit waiting to happen.' : `Unlocks at High ${fmt(r.unlockHigh)}`) : r.blurb}
            owned={level}
            meta={maxed ? 'complete' : `lv ${level}/${r.maxLevel}`}
            cost={impact?.cost ?? cost ?? 0}
            canAfford={!locked && !maxed && (impact?.affordable ?? funds >= (cost ?? Infinity))}
            locked={locked}
            maxed={maxed}
            impact={impact ? formatPurchaseImpact(impact) : undefined}
            currency={r.currency}
            onBuy={() => buy(r.id)}
          />
        )
      })}
    </Section>
  )
}

export { ScrollText }
