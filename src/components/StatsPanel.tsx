import { useGame } from '../lib/store'
import { clarityMultiplier, computeRates } from '../lib/engine'
import { pickSave } from '../lib/save'
import { fmt, fmtRate } from '../lib/format'
import {
  afternoonGoalProgress,
  nextAfternoonGoal,
  type AfternoonGoal,
  type AfternoonMilestoneKind,
} from '../lib/progress'
import { useAfternoonProgressSnapshot } from './AfternoonProgress'
import { cx, Panel } from './ui'

const GOAL_KIND_LABELS: Record<AfternoonMilestoneKind, string> = {
  mood: 'Mood',
  grow: 'Grow',
  work: 'Work',
  ritual: 'Ritual',
}

export function StatsPanel() {
  const high = useGame(s => s.high)
  const buzz = useGame(s => s.buzz)
  const nugs = useGame(s => s.nugs)
  const cash = useGame(s => s.cash)
  const enlightenment = useGame(s => s.enlightenment)
  const totalHits = useGame(s => s.totalHits)
  // Rates depend on most of the save; recompute from the live state each render.
  const rates = computeRates(pickSave(useGame.getState()))
  const afternoon = useAfternoonProgressSnapshot()
  const barMax = Math.max(40, buzz * 1.15)
  const barPct = Math.min(100, (buzz / barMax) * 100)

  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">High</p>
      <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em] text-fg tabular-nums sm:text-5xl">{fmt(high)}</p>
      {afternoon.phase === 'active' ? <AfternoonGoalRail high={high} goal={afternoon.goal} /> : null}
      {afternoon.phase === 'reached' ? <AfternoonReachedRail goals={afternoon.goals} /> : null}
      {afternoon.phase === 'complete' ? <AfternoonCompleteRail /> : null}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Buzz · {rates.buzzMult.toFixed(2)}×</span>
          <span className="tabular-nums">{fmt(buzz)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-portal shadow-[0_0_14px_color-mix(in_oklab,var(--color-accent)_45%,transparent)] transition-[width] duration-300 ease-out" style={{ width: `${barPct}%` }} />
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resource label="Nugs" value={fmt(nugs)} rate={fmtRate(rates.nugRate)} tone="green" />
        <Resource label="Cash" value={fmt(cash)} rate={fmtRate(rates.cashRate)} tone="gold" />
        {enlightenment > 0 ? (
          <Resource label="Clarity" value={fmt(enlightenment, 0)} rate={`×${clarityMultiplier(enlightenment).toFixed(2)} kept`} tone="violet" />
        ) : (
          <Resource label="Hits" value={fmt(totalHits, 0)} rate="manual + auto" tone="rust" />
        )}
      </dl>
    </Panel>
  )
}

function AfternoonGoalRail({ high, goal }: { high: number; goal: NonNullable<ReturnType<typeof nextAfternoonGoal>> }) {
  const progress = afternoonGoalProgress(high, goal)
  const current = Math.min(goal.atHigh, Math.max(goal.fromHigh, high))
  const remaining = Math.max(0, goal.atHigh - high)
  const segmentCurrent = current - goal.fromHigh
  const segmentTotal = goal.atHigh - goal.fromHigh
  const accessibleGoal = goal.milestones
    .map(item => `${GOAL_KIND_LABELS[item.kind]} ${item.label}`)
    .join(' and ')

  return (
    <div className="surface-card mt-3 rounded-[12px] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Next this afternoon</p>
          <div className="mt-0.5 text-sm text-fg" aria-live="polite">
            {goal.milestones.map(item => (
              <p key={`${item.kind}:${item.id}`} className="line-clamp-2">
                <span className="text-accent">{GOAL_KIND_LABELS[item.kind]}</span>
                <span className="text-subtle"> · </span>
                {item.label}
              </p>
            ))}
          </div>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted">High {fmt(goal.atHigh)}</p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated shadow-inner"
        role="progressbar"
        aria-label={`Progress to ${accessibleGoal}`}
        aria-valuemin={0}
        aria-valuemax={segmentTotal}
        aria-valuenow={segmentCurrent}
        aria-valuetext={`${fmt(remaining)} High to go`}
      >
        <div
          className="h-full rounded-full bg-accent shadow-[0_0_12px_color-mix(in_oklab,var(--color-accent)_35%,transparent)] transition-[width] duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs tabular-nums text-subtle">
        <span>{fmt(segmentCurrent)} / {fmt(segmentTotal)}</span>
        <span>{fmt(remaining)} to go</span>
      </div>
    </div>
  )
}

function AfternoonReachedRail({ goals }: { goals: AfternoonGoal[] }) {
  const milestones = goals.flatMap(goal => goal.milestones)
  const visible = milestones.slice(0, 3)
  const more = milestones.length - visible.length
  const lastHigh = goals[goals.length - 1].atHigh

  return (
    <div className="surface-card mt-3 rounded-[12px] px-3 py-3" role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Just arrived</p>
          <div className="mt-0.5 text-sm text-fg">
            {visible.map(item => (
              <p key={`${item.kind}:${item.id}`} className="line-clamp-2">
                <span className="text-accent">{GOAL_KIND_LABELS[item.kind]}</span>
                <span className="text-subtle"> · </span>
                {item.label}
              </p>
            ))}
            {more > 0 ? <p className="text-muted">+{more} more arrivals</p> : null}
          </div>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted">High {fmt(lastHigh)}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated shadow-inner" aria-hidden="true">
        <div className="h-full w-full rounded-full bg-accent shadow-[0_0_12px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]" />
      </div>
    </div>
  )
}

function AfternoonCompleteRail() {
  return (
    <div className="surface-card mt-3 rounded-[12px] px-3 py-3" role="status" aria-live="polite">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Afternoon shelf complete</p>
      <p className="mt-0.5 text-sm text-fg">All current afternoon unlocks found.</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated shadow-inner" aria-hidden="true">
        <div className="h-full w-full rounded-full bg-accent shadow-[0_0_12px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]" />
      </div>
    </div>
  )
}

const RESOURCE_TONES = {
  green: 'text-accent',
  gold: 'text-story',
  violet: 'text-dream',
  rust: 'text-rust',
} as const

function Resource({ label, value, rate, tone }: { label: string; value: string; rate: string; tone: keyof typeof RESOURCE_TONES }) {
  return (
    <div className="surface-card rounded-[12px] px-3 py-2.5">
      <dt className={cx('text-xs uppercase tracking-[0.14em]', RESOURCE_TONES[tone])}>{label}</dt>
      <dd className="mt-0.5 text-lg font-medium tabular-nums text-fg">{value}</dd>
      <p className="text-xs tabular-nums text-muted">{rate}</p>
    </div>
  )
}
