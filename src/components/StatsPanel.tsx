import { useGame } from '../lib/store'
import { clarityMultiplier, computeRates } from '../lib/engine'
import { pickSave } from '../lib/save'
import { fmt, fmtRate } from '../lib/format'
import { cx, Panel } from './ui'

export function StatsPanel() {
  const high = useGame(s => s.high)
  const buzz = useGame(s => s.buzz)
  const nugs = useGame(s => s.nugs)
  const cash = useGame(s => s.cash)
  const enlightenment = useGame(s => s.enlightenment)
  const totalHits = useGame(s => s.totalHits)
  // Rates depend on most of the save; recompute from the live state each render.
  const rates = computeRates(pickSave(useGame.getState()))
  const barMax = Math.max(40, buzz * 1.15)
  const barPct = Math.min(100, (buzz / barMax) * 100)

  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">High</p>
      <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em] text-fg tabular-nums sm:text-5xl">{fmt(high)}</p>
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
