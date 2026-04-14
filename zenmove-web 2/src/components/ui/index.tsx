// src/components/ui/index.tsx
import type { MoveStatus } from '../../services/api'
import { STATUS_LABEL } from '../../utils'
import { Loader2 } from 'lucide-react'

// ── StatusBadge ────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: MoveStatus }) {
  return (
    <span className={`badge-${status} inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <Loader2
      size={size}
      className="animate-spin"
      style={{ color: 'var(--teal)' }}
    />
  )
}

// ── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1
          className="font-display font-semibold text-2xl leading-tight"
          style={{ color: 'var(--navy)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="font-body text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = '',
  accent = false,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  accent?: boolean
  onClick?: () => void
}) {
  const base = `bg-white rounded-xl border overflow-hidden transition-all duration-200`
  const hover = onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
  const accClass = accent ? 'accent-card border-l-0' : 'border-[var(--border)]'

  return (
    <div className={`${base} ${hover} ${accClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-2)' }}
      >
        <Icon size={24} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3
        className="font-display font-semibold text-base mb-1"
        style={{ color: 'var(--navy)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="font-body text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Button ─────────────────────────────────────────────────────────────────
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'text-white shadow-sm active:scale-[0.98]',
    secondary: 'border text-navy-600 bg-white hover:bg-[var(--surface-2)] border-[var(--border)]',
    ghost:     'text-[var(--text-muted)] hover:text-[var(--navy)] hover:bg-[var(--surface-2)]',
    danger:    'bg-red-500 text-white hover:bg-red-600',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const primaryStyle = variant === 'primary'
    ? { background: 'var(--navy)', color: 'white' }
    : {}

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={primaryStyle}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────
export function Input({
  label,
  error,
  ...props
}: {
  label?: string
  error?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-body text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white font-body text-sm transition-all
          ${error ? 'border-red-400' : 'border-[var(--border)]'} ${props.className ?? ''}`}
        style={{ color: 'var(--text)' }}
      />
      {error && <p className="text-red-500 text-xs font-body">{error}</p>}
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────────────────────
export function Select({
  label,
  error,
  children,
  ...props
}: {
  label?: string
  error?: string
  children: React.ReactNode
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-body text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <select
        {...props}
        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white font-body text-sm transition-all
          ${error ? 'border-red-400' : 'border-[var(--border)]'} ${props.className ?? ''}`}
        style={{ color: 'var(--text)' }}
      >
        {children}
      </select>
      {error && <p className="text-red-500 text-xs font-body">{error}</p>}
    </div>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  color = 'var(--navy)',
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div
      className="rounded-xl p-4 border border-[var(--border)] bg-white"
    >
      <p className="font-body text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-display font-semibold text-2xl leading-none" style={{ color }}>
        {value}
      </p>
      {sub && <p className="font-body text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}
