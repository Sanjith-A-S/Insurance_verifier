import React, { useState } from 'react';

export function Button({
  variant = 'filled',
  size = 'm',
  children,
  onClick,
  disabled,
  className = '',
  type = 'button',
  style,
}) {
  const variantClass = `btn-${variant}`;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`btn ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function Chip({ label, variant = 'grey', onClick, style }) {
  const variantClass = `chip-${variant}`;
  return (
    <span
      className={`chip ${variantClass}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  let variant = 'grey';
  if (['ready', 'completed', 'verified', 'resolved', 'ok', 'active'].includes(status)) {
    variant = 'lime';
  } else if (['in_review', 'running', 'processing', 'new', 'sent', 'pending'].includes(status)) {
    variant = 'cobalt';
  } else if (['withheld', 'dismissed', 'failed', 'blocked', 'needs_replacement'].includes(status)) {
    variant = 'red';
  }
  return <Chip label={status ? status.replace(/_/g, ' ') : 'unknown'} variant={variant} />;
}

export function Card({ title, subtitle, action, children, raised = false, style, className = '' }) {
  return (
    <div className={`${raised ? 'm3-card-raised' : 'm3-card'} ${className}`} style={style}>
      {(title || action) && (
        <div className="card-title">
          <div>
            {title}
            {subtitle && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>{subtitle}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="field-group">
      {label && <label className="label-caps">{label}</label>}
      {children}
      {hint && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>{error}</span>}
    </div>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="toast-container">
      <div className="toast-pill" onClick={onDismiss}>
        <div>
          <strong>[{toast.code || 'ERROR'}]</strong> {toast.message}
          {toast.fields && Object.keys(toast.fields).length > 0 && (
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: 4 }}>
              Fields: {Object.entries(toast.fields).map(([k, v]) => `${k}: ${v}`).join(', ')}
            </div>
          )}
        </div>
        <span style={{ fontSize: '1rem', opacity: 0.7 }}>&times;</span>
      </div>
    </div>
  );
}

export function Spinner({ size = 24 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

export function Empty({ message = 'No data available', action = null }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ fontSize: '1.8rem', opacity: 0.4 }}>📂</div>
      <div style={{ fontSize: '0.9rem' }}>{message}</div>
      {action}
    </div>
  );
}

export function JsonView({ data, title }) {
  const [copied, setCopied] = useState(false);
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: '#040406',
        borderRadius: '16px',
        border: '1px solid var(--surface-border)',
        overflow: 'hidden',
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 14px',
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--surface-border)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <span>{title || 'JSON'}</span>
        <Button variant="text" size="s" onClick={handleCopy} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre
        style={{
          padding: '12px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--text)',
          overflowX: 'auto',
          maxHeight: '340px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </pre>
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, label }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div style={{ width: '100%', margin: '8px 0' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-muted)' }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'var(--surface-border)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--primary)',
            borderRadius: '9999px',
            transition: 'width 250ms var(--ease-spring)',
          }}
        />
      </div>
    </div>
  );
}

