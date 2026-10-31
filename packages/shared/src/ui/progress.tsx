// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · ui/progress.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import { scallopPath, ringProgress } from '../utils/scallop.js';

export interface ScallopProgressProps {
  done: number;
  total: number;
  width?: number;
  height?: number;
  label?: string;
}

export function ScallopProgress({
  done,
  total,
  width = 120,
  height = 14,
  label,
}: ScallopProgressProps) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const path = scallopPath({ width, height, progress: fraction, radius: height / 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {label && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {label}
          </span>
        )}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: fraction === 1 ? 'var(--color-accent)' : 'var(--color-text)',
          }}
        >
          {done}/{total}
        </span>
      </div>
      <div
        style={{
          width,
          height,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: height / 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg width={width} height={height} style={{ display: 'block' }}>
          <path
            d={path}
            fill={fraction === 1 ? 'var(--color-accent)' : 'var(--color-primary)'}
            style={{
              transition: 'all var(--duration-normal) var(--ease-standard)',
            }}
          />
        </svg>
      </div>
    </div>
  );
}

// ── Circular Ring Progress ─────────────────────────────────────────────
export function CircularProgress({
  done,
  total,
  size = 36,
  strokeWidth = 3,
}: {
  done: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const fraction = total > 0 ? done / total : 0;
  const { dashArray, dashOffset } = ringProgress(radius, fraction);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={fraction === 1 ? 'var(--color-accent)' : 'var(--color-primary)'}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset var(--duration-normal) var(--ease-standard)' }}
      />
    </svg>
  );
}

// ── StageMarker ────────────────────────────────────────────────────────
const STAGES = [
  { id: 'draft', label: 'Draft' },
  { id: 'intake', label: 'Submitted' },
  { id: 'evidence_collection', label: 'Evidence' },
  { id: 'analysis', label: 'Investigation' },
  { id: 'decision', label: 'Decision' },
  { id: 'closed', label: 'Completed' },
];

export function StageMarker({ currentStage }: { currentStage: string }) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
  const activeIdx = currentIndex >= 0 ? currentIndex : 1;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        padding: '12px 0',
      }}
    >
      {STAGES.map((s, idx) => {
        const isDone = idx < activeIdx;
        const isCurrent = idx === activeIdx;

        return (
          <React.Fragment key={s.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: isCurrent
                  ? 'var(--color-primary-tint)'
                  : isDone
                  ? 'rgba(34,197,94,0.1)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  isCurrent
                    ? 'var(--color-primary)'
                    : isDone
                    ? 'rgba(34,197,94,0.3)'
                    : 'var(--color-border)'
                }`,
                color: isCurrent
                  ? 'var(--color-primary-text)'
                  : isDone
                  ? 'var(--color-success)'
                  : 'var(--color-text-faint)',
                fontSize: 'var(--text-xs)',
                fontWeight: isCurrent ? 600 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  background: isCurrent
                    ? 'var(--color-primary)'
                    : isDone
                    ? 'var(--color-success)'
                    : 'rgba(255,255,255,0.1)',
                  color: isCurrent || isDone ? '#fff' : 'inherit',
                }}
              >
                {isDone ? '✓' : idx + 1}
              </span>
              {s.label}
            </div>
            {idx < STAGES.length - 1 && (
              <div
                style={{
                  width: 14,
                  height: 2,
                  background: idx < activeIdx ? 'var(--color-success)' : 'var(--color-border)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

