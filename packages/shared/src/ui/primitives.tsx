// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · ui/primitives.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import type { ClaimStatus, ClaimPriority, FactType, FindingStatus } from '../types.js';
import { CLAIM_STATUS_MAP, CLAIM_PRIORITY_MAP, FACT_TYPE_MAP, FINDING_STATUS_MAP } from '../constants.js';

// ── Button ─────────────────────────────────────────────────────────────
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'filled', size = 'md', className = '', style, children, disabled, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast), transform var(--duration-fast)',
      border: '1px solid transparent',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '6px 14px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-sm)' },
      md: { padding: '10px 20px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-md)' },
      lg: { padding: '14px 28px', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-lg)' },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      filled: {
        background: 'var(--color-primary)',
        color: '#ffffff',
        borderColor: 'var(--color-primary)',
      },
      tonal: {
        background: 'var(--color-primary-tint)',
        color: 'var(--color-primary-text)',
        borderColor: 'rgba(26,110,245,0.25)',
      },
      outlined: {
        background: 'transparent',
        color: 'var(--color-text)',
        borderColor: 'var(--color-border-strong)',
      },
      text: {
        background: 'transparent',
        color: 'var(--color-primary-text)',
      },
      danger: {
        background: 'var(--color-error-tint)',
        color: 'var(--color-error)',
        borderColor: 'rgba(239,68,68,0.3)',
      },
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant], ...style }}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ── IconButton ─────────────────────────────────────────────────────────
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', label, children, style, ...props }, ref) => {
    const dim = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          transition: 'background var(--duration-fast)',
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';

// ── StatusBadge ────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: ClaimStatus | string }) {
  const meta = CLAIM_STATUS_MAP[status as ClaimStatus] || { label: status, color: 'neutral' };
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    neutral: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
    blue:    { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
    orange:  { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
    yellow:  { bg: 'rgba(234,179,8,0.15)',  text: '#facc15', border: 'rgba(234,179,8,0.3)' },
    purple:  { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
    green:   { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    red:     { bg: 'rgba(239,68,68,0.15)',  text: '#f87171', border: 'rgba(239,68,68,0.3)' },
    teal:    { bg: 'rgba(20,184,166,0.15)', text: '#2dd4bf', border: 'rgba(20,184,166,0.3)' },
  };

  const col = colorMap[meta.color] || colorMap.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        background: col.bg,
        color: col.text,
        border: `1px solid ${col.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.text }} />
      {meta.label}
    </span>
  );
}

// ── FactTypeTag ────────────────────────────────────────────────────────
export function FactTypeTag({ type, short = false }: { type: FactType | string; short?: boolean }) {
  const meta = FACT_TYPE_MAP[type as FactType] || { label: type, shortLabel: type, color: 'neutral' };
  const label = short ? meta.shortLabel : meta.label;

  const colorStyles: Record<string, { bg: string; text: string }> = {
    teal:    { bg: 'rgba(20,184,166,0.12)', text: '#2dd4bf' },
    blue:    { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
    indigo:  { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
    orange:  { bg: 'rgba(249,115,22,0.12)', text: '#fb923c' },
    purple:  { bg: 'rgba(168,85,247,0.12)', text: '#c084fc' },
    neutral: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' },
  };

  const col = colorStyles[meta.color] || colorStyles.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        fontWeight: 500,
        background: col.bg,
        color: col.text,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  );
}

// ── PriorityTag ────────────────────────────────────────────────────────
export function PriorityTag({ priority }: { priority: ClaimPriority }) {
  const meta = CLAIM_PRIORITY_MAP[priority] || { label: priority, color: 'neutral' };
  const colors: Record<string, string> = {
    red: '#f87171',
    orange: '#fb923c',
    neutral: '#9ca3af',
  };
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color: colors[meta.color] || '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {meta.label}
    </span>
  );
}

// ── ProvenanceChip ─────────────────────────────────────────────────────
export function ProvenanceChip({ label, icon }: { label: string; icon?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}

// ── States ─────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '48px 24px',
        color: 'var(--color-text-muted)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 'var(--text-sm)' }}>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '12px',
        padding: '56px 24px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed var(--color-border-strong)',
      }}
    >
      <div style={{ fontSize: '2rem', opacity: 0.4 }}>📂</div>
      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{title}</h3>
      {message && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: 400 }}>
          {message}
        </p>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'An error occurred',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--color-error-tint)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <h4 style={{ color: 'var(--color-error)', fontWeight: 600 }}>{title}</h4>
      {message && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{message}</p>}
      {onRetry && (
        <div>
          <Button variant="outlined" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

