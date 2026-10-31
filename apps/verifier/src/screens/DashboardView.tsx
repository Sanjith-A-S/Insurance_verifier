// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/DashboardView.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { Suspense, lazy } from 'react';
import { LoadingState, ErrorState, StatusBadge, Button } from '@claimlens/shared/ui';
import { formatDate } from '@claimlens/shared/utils/format';
import { queryHooks } from '../client';

// Lazy load Recharts
const DashboardChart = lazy(() => import('../components/DashboardChart'));

export function DashboardView({
  onSelectClaim,
  onViewQueue,
}: {
  onSelectClaim: (claimId: string) => void;
  onViewQueue: (filterStatus?: string) => void;
}) {
  const { data: dashboard, isLoading, error } = queryHooks.useDashboard();

  if (isLoading) return <LoadingState message="Loading dashboard statistics…" />;
  if (error || !dashboard) return <ErrorState title="Failed to load dashboard" message={error?.message} />;

  const { totals, overTime, completenessBands, nextUp, recentActivity } = dashboard;

  // Rule: Omit claims over time chart if < 8 claims across < 3 distinct dates
  const showChart = totals.total >= 8 && overTime.length >= 3;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Queue shortcut */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Claims Investigation Dashboard
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Portfolio overview and immediate investigation workload.
          </p>
        </div>
        <Button variant="filled" size="md" onClick={() => onViewQueue()}>
          Open Investigation Queue →
        </Button>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Total Submitted', value: totals.total, color: 'var(--color-text)', status: undefined },
          { label: 'New / Intake', value: totals.new, color: '#60a5fa', status: 'new' },
          { label: 'In Review', value: totals.in_review, color: '#fb923c', status: 'in_review' },
          { label: 'Awaiting Claimant', value: totals.awaiting_claimant, color: '#facc15', status: 'awaiting_claimant' },
          { label: 'Decision Pending', value: totals.decision_pending, color: '#c084fc', status: 'decision_pending' },
          { label: 'Completed', value: totals.completed, color: '#4ade80', status: 'completed' },
        ].map((tile) => (
          <div
            key={tile.label}
            onClick={() => tile.status && onViewQueue(tile.status)}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              cursor: tile.status ? 'pointer' : 'default',
              transition: 'border-color var(--duration-fast)',
            }}
            onMouseEnter={(e) => {
              if (tile.status) e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              if (tile.status) e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{tile.label}</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: tile.color }}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Chart + Completeness Bands */}
      <div style={{ display: 'grid', gridTemplateColumns: showChart ? '2fr 1fr' : '1fr', gap: '20px' }}>
        {showChart && (
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Claims Intake Over Time</div>
            <Suspense fallback={<LoadingState message="Loading chart…" />}>
              <DashboardChart data={overTime} />
            </Suspense>
          </div>
        )}

        {/* Completeness Bands */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Evidence Completeness</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-success)' }}>Complete (All Required)</span>
                <span style={{ fontWeight: 600 }}>{completenessBands.complete}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(completenessBands.complete / totals.total) * 100}%`, height: '100%', background: 'var(--color-success)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                <span style={{ color: '#fb923c' }}>Partial (Some Missing)</span>
                <span style={{ fontWeight: 600 }}>{completenessBands.partial}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(completenessBands.partial / totals.total) * 100}%`, height: '100%', background: '#fb923c' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-error)' }}>Mostly Missing</span>
                <span style={{ fontWeight: 600 }}>{completenessBands.mostlyMissing}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(completenessBands.mostlyMissing / totals.total) * 100}%`, height: '100%', background: 'var(--color-error)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Next Up for Review + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Next Up */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Next Up for Investigation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nextUp.length === 0 ? (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                No unassigned claims awaiting investigation.
              </div>
            ) : (
              nextUp.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectClaim(c.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                        {c.id}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {c.claimantName} · {c.vehicle.make} {c.vehicle.model}
                    </div>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)', fontWeight: 600 }}>
                    Open →
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map((act: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--color-primary)' }}>•</span>
                <div>
                  <div style={{ color: 'var(--color-text)' }}>{act.text || act.summary}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '10px', marginTop: '2px' }}>
                    {formatDate(act.at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

