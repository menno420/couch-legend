import { useEffect } from 'react'
import { useGame } from './lib/store'
import { CouchPanel } from './components/CouchPanel'
import { StatsPanel } from './components/StatsPanel'
import { GrowTab, RitualsTab, TabBar, WorkTab } from './components/ShopTabs'
import { LoreTab } from './components/LoreTab'
import {
  BootScreen, Header, NewsLine, OfflineBanner, PrestigeModal, ResetModal,
  SettingsModal, Toasts,
} from './components/Chrome'

const STEP = 1 / 20

export default function App() {
  const ready = useGame(s => s.ready)
  const booted = useGame(s => s.booted)
  const tab = useGame(s => s.tab)
  const hydrate = useGame(s => s.hydrate)
  const tick = useGame(s => s.tick)
  const flushSave = useGame(s => s.flushSave)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!ready || !booted) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      acc += dt
      while (acc >= STEP) {
        tick(STEP)
        acc -= STEP
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushSave)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushSave)
      flushSave()
    }
  }, [ready, booted, tick, flushSave])

  return (
    <main className="relative min-h-dvh bg-bg text-fg">
      {booted ? (
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-16">
          <Header />
          <NewsLine />
          <OfflineBanner />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="flex flex-col gap-4 pb-14 lg:sticky lg:top-4 lg:self-start lg:pb-0">
              <CouchPanel />
              <StatsPanel />
            </div>
            <div className="flex flex-col gap-3">
              <div className="sticky top-3 z-10 bg-bg py-1">
                <TabBar />
              </div>
              <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                {tab === 'grow' ? <GrowTab /> : null}
                {tab === 'work' ? <WorkTab /> : null}
                {tab === 'rituals' ? <RitualsTab /> : null}
                {tab === 'lore' ? <LoreTab /> : null}
              </section>
            </div>
          </div>
        </div>
      ) : (
        <BootScreen />
      )}
      <Toasts />
      <SettingsModal />
      <PrestigeModal />
      <ResetModal />
    </main>
  )
}
