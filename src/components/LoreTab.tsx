import { ScrollText, Sunrise } from 'lucide-react'
import { useGame } from '../lib/store'
import { ACHIEVEMENTS, MOODS } from '../lib/content'
import { clarityMultiplier, prestigeGain } from '../lib/engine'
import { pickSave } from '../lib/save'
import { fmt, fmtDuration } from '../lib/format'
import { Button, StatTile, cx } from './ui'

export function LoreTab() {
  const achievements = useGame(s => s.achievements)
  const playTime = useGame(s => s.playTime)
  const totalHits = useGame(s => s.totalHits)
  const peakHigh = useGame(s => s.peakHigh)
  const enlightenment = useGame(s => s.enlightenment)
  const setShowPrestige = useGame(s => s.setShowPrestige)
  const gain = prestigeGain(pickSave(useGame.getState()))
  const earned = ACHIEVEMENTS.filter(a => achievements.includes(a.id)).length
  const revealed = MOODS.filter(m => peakHigh >= m.minHigh)

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-0.015em] text-fg">
        <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-story/10 text-story">
          <ScrollText className="size-4" aria-hidden />
        </span>
        Chronicle
      </h2>
      <p className="mt-1 text-sm text-muted">Revelations, titles, and everything the couch remembers.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Peak high" value={fmt(peakHigh)} />
        <StatTile label="Hits" value={fmt(totalHits, 0)} />
        <StatTile label="Session" value={fmtDuration(playTime)} />
        <StatTile label="Stories" value={`${earned}/${ACHIEVEMENTS.length}`} />
      </div>

      <div className="surface-card story-card mt-4 rounded-[14px] p-4">
        <p className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
          <Sunrise className="size-4 text-story" aria-hidden />
          Wake &amp; Bake
        </p>
        <p className="mt-1 text-sm text-muted">Come down overnight. Keep your lore. Gain Clarity that multiplies everything next session.</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Banked {fmt(enlightenment, 0)} · ×{clarityMultiplier(enlightenment).toFixed(2)} now
            {gain > 0 ? <> → ×{clarityMultiplier(enlightenment + gain).toFixed(2)} after</> : <> · next at High 400</>}
          </p>
          <Button size="sm" disabled={gain < 1} onClick={() => setShowPrestige(true)}>
            Come down
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">Revelations</p>
        <ul className="mt-2 flex flex-col gap-2">
          {MOODS.map(m => {
            const unlocked = peakHigh >= m.minHigh
            return (
              <li key={m.id} className={cx('surface-card rounded-[14px] px-3 py-2.5', unlocked ? 'story-card' : 'surface-card-muted')}>
                <p className={cx('font-display text-sm', unlocked ? 'text-story' : 'text-muted')}>{m.name}</p>
                <p className={cx('text-sm', unlocked ? 'text-fg' : 'text-muted')}>
                  {unlocked ? m.revelation : `Reaches you at High ${fmt(m.minHigh)}.`}
                </p>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-xs text-subtle">{revealed.length}/{MOODS.length} revealed · revelations survive Wake &amp; Bake</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {ACHIEVEMENTS.map(a => {
          const has = achievements.includes(a.id)
          return (
            <li key={a.id} className={cx('surface-card rounded-[14px] px-3 py-2.5', has ? 'side-story-card' : 'surface-card-muted')}>
              <p className={cx('font-medium', has ? 'text-dream' : 'text-muted')}>{a.name}</p>
              <p className="text-sm text-muted">{has ? a.blurb : 'Not yet.'}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
