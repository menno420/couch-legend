import { useGame } from '../lib/store'
import { computeRates } from '../lib/engine'
import { pickSave } from '../lib/save'
import { fmt, fmtRate } from '../lib/format'

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
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">High</p>
      <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em] text-fg tabular-nums sm:text-5xl">{fmt(high)}</p>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Buzz · {rates.buzzMult.toFixed(2)}×</span>
          <span className="tabular-nums">{fmt(buzz)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${barPct}%` }} />
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resource label="Nugs" value={fmt(nugs)} rate={fmtRate(rates.nugRate)} />
        <Resource label="Cash" value={fmt(cash)} rate={fmtRate(rates.cashRate)} />
        {enlightenment > 0 ? (
          <Resource label="Clarity" value={fmt(enlightenment, 0)} rate={`×${(1 + enlightenment * 0.18).toFixed(2)} kept`} />
        ) : (
          <Resource label="Hits" value={fmt(totalHits, 0)} rate="manual + auto" />
        )}
      </dl>
    </div>
  )
}

function Resource({ label, value, rate }: { label: string; value: string; rate: string }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-2">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</dt>
      <dd className="mt-0.5 text-lg font-medium tabular-nums text-fg">{value}</dd>
      <p className="text-xs tabular-nums text-muted">{rate}</p>
    </div>
  )
}
