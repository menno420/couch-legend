import type { ButtonHTMLAttributes, ReactNode } from 'react'

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'bg-elevated text-fg border border-border hover:border-muted',
  ghost: 'bg-transparent text-muted hover:text-fg hover:bg-elevated',
  hit: 'bg-accent text-accent-fg shadow-soft hover:opacity-95',
} as const

const SIZES = {
  sm: 'h-9 px-3 text-sm rounded-[10px]',
  md: 'h-11 px-4 text-sm rounded-md',
  lg: 'h-14 px-6 text-base rounded-lg',
  xl: 'h-16 px-8 text-lg rounded-lg',
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
        'inline-flex items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.96]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  )
}

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Dismiss" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-soft" role="dialog" aria-modal="true" aria-label={title}>
        <h3 className="font-display text-2xl font-semibold text-fg">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums text-fg">{value}</p>
      {sub ? <p className="text-xs tabular-nums text-muted">{sub}</p> : null}
    </div>
  )
}
