import { useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const VARIANTS = {
  primary: 'bg-accent text-accent-fg shadow-[0_8px_24px_color-mix(in_oklab,var(--color-accent)_18%,transparent)] hover:brightness-105',
  secondary: 'border border-interactive-border bg-elevated/90 text-fg hover:border-accent/70 hover:bg-elevated',
  ghost: 'bg-transparent text-muted hover:bg-elevated/80 hover:text-fg',
  hit: 'bg-accent text-accent-fg shadow-[0_12px_34px_color-mix(in_oklab,var(--color-accent)_24%,transparent)] hover:brightness-105',
} as const

const SIZES = {
  sm: 'h-9 px-3 text-sm rounded-[10px]',
  md: 'h-11 px-4 text-sm rounded-[12px]',
  lg: 'h-14 px-6 text-base rounded-[14px]',
  xl: 'h-16 px-8 text-lg rounded-[16px]',
} as const

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-medium transition-[filter,opacity,transform,background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-55 active:scale-[0.97]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  )
}

type PanelTone = 'default' | 'story' | 'dream' | 'portal' | 'rust'
const PANEL_BASE = 'panel-chrome rounded-[18px]'

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article'
  tone?: PanelTone
}

/** Shared smoked-glass page chrome. Tone changes only the quiet top keyline. */
export function Panel({ as: Tag = 'div', tone = 'default', className, children, ...rest }: PanelProps) {
  return (
    <Tag
      className={cx(PANEL_BASE, className)}
      data-tone={tone === 'default' ? undefined : tone}
      {...rest}
    >
      {children}
    </Tag>
  )
}

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const appRoot = document.getElementById('root')
    const rootWasInert = appRoot?.inert ?? false
    const rootAriaHidden = appRoot?.getAttribute('aria-hidden') ?? null
    const bodyOverflow = document.body.style.overflow

    if (appRoot) {
      appRoot.inert = true
      appRoot.setAttribute('aria-hidden', 'true')
    }
    document.body.style.overflow = 'hidden'

    const focusFrame = requestAnimationFrame(() => dialog.focus({ preventScroll: true }))
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter(node => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true')

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = bodyOverflow
      if (appRoot) {
        appRoot.inert = rootWasInert
        if (rootAriaHidden == null) appRoot.removeAttribute('aria-hidden')
        else appRoot.setAttribute('aria-hidden', rootAriaHidden)
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/75 p-3 backdrop-blur-[3px] sm:items-center sm:p-4">
      <button type="button" tabIndex={-1} className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        className={cx(PANEL_BASE, 'relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:max-h-[calc(100dvh-2rem)] sm:p-6')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h3 id={titleId} className="font-display text-2xl font-semibold tracking-[-0.02em] text-fg">{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface-card rounded-[12px] px-3 py-2.5">
      <p className="text-xs uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums text-fg">{value}</p>
      {sub ? <p className="text-xs tabular-nums text-muted">{sub}</p> : null}
    </div>
  )
}
