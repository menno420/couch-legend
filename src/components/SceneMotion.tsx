import { useEffect, useRef, useState } from 'react'

export type SceneMotionPreset =
  | 'couch-room'
  | 'parking-lot'
  | 'corner-store'
  | 'cousins-room'

const MOTES = [
  { left: '14%', top: '69%', delay: '-1.4s', duration: '8.6s' },
  { left: '31%', top: '77%', delay: '-5.1s', duration: '10.8s' },
  { left: '47%', top: '61%', delay: '-7.8s', duration: '9.7s' },
  { left: '62%', top: '72%', delay: '-3.2s', duration: '11.6s' },
  { left: '76%', top: '58%', delay: '-9.5s', duration: '12.4s' },
  { left: '88%', top: '74%', delay: '-6.4s', duration: '9.2s' },
] as const

/**
 * A cheap, scene-local atmosphere layer. Presets describe story weather rather
 * than mechanics, and animate only opacity and transforms. The layer pauses
 * when the scene leaves the viewport or the document is hidden.
 */
export function SceneMotion({ preset }: { preset: SceneMotionPreset }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    let inView = true

    const sync = () => {
      setActive(inView && document.visibilityState !== 'hidden')
    }

    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(entries => {
          inView = entries[0]?.isIntersecting ?? true
          sync()
        }, { threshold: 0.05 })

    if (rootRef.current) observer?.observe(rootRef.current)
    document.addEventListener('visibilitychange', sync)
    sync()

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="scene-motion pointer-events-none absolute inset-0 overflow-hidden"
      data-motion={preset}
      data-active={active ? 'true' : 'false'}
      aria-hidden="true"
    >
      <span className="scene-motion__light" />
      <span className="scene-motion__secondary" />
      <span className="scene-motion__travel" />
      <span className="scene-motion__motes">
        {MOTES.map((mote, index) => (
          <i
            key={index}
            style={{
              left: mote.left,
              top: mote.top,
              animationDelay: mote.delay,
              animationDuration: mote.duration,
            }}
          />
        ))}
      </span>
      <span className="scene-motion__texture" />
    </div>
  )
}
