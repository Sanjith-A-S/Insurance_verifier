// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/ClaimsHome.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import type { ClaimSummary, User } from '@claimlens/shared/types';
import { StatusBadge, ScallopProgress, Button, LoadingState, EmptyState, ErrorState } from '@claimlens/shared/ui';
import { formatDate } from '@claimlens/shared/utils/format';

export function ClaimsHome({
  claims,
  loading,
  error,
  user,
  onSelectClaim,
  onCreateClaim,
}: {
  claims: ClaimSummary[];
  loading: boolean;
  error: Error | null;
  user: User;
  onSelectClaim: (claimId: string) => void;
  onCreateClaim: () => void;
}) {
  if (loading) return <LoadingState message="Loading your claims…" />;
  if (error) return <ErrorState title="Failed to load claims" message={error.message} />;

  // Filter items that need the user's attention
  const needsAttention = claims.filter(
    (c) => c.status === 'awaiting_claimant' || c.openRequestCount > 0 || c.unreadMessageCount > 0
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Welcome, {user.name}
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Track your ongoing vehicle insurance claims and respond to investigator requests.
        </p>
      </div>

      {/* "Needs You" Strip */}
      {needsAttention.length > 0 && (
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(234,179,8,0.1)',
            border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#facc15' }}>
              Action Required ({needsAttention.length})
            </span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            The investigation team has requested additional evidence or clarification for the following:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {needsAttention.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectClaim(c.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid rgba(234,179,8,0.4)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{c.id}</span>
                <span style={{ color: '#facc15' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Claim Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Your Claims</h2>
          <Button variant="tonal" size="sm" onClick={onCreateClaim}>
            + File New Claim
          </Button>
        </div>

        {claims.length === 0 ? (
          <EmptyState
            title="No Claims Found"
            message="You haven't filed any insurance claims yet. Start a new claim to begin."
            action={
              <Button variant="filled" size="md" onClick={onCreateClaim}>
                Start a New Claim
              </Button>
            }
          />
        ) : (
          claims.map((c) => {
            const nextStepText = typeof c.nextStep === 'object' && c.nextStep
              ? c.nextStep.label || c.nextStep.description
              : String(c.nextStep || 'View details');

            return (
              <div
                key={c.id}
                onClick={() => onSelectClaim(c.id)}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'border-color var(--duration-fast), transform var(--duration-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header row: ID, Status, Incident Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)' }}>
                        {c.id}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {c.vehicle.make} {c.vehicle.model} ({c.vehicle.registrationNumber})
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                    Incident: {formatDate(c.incident.date)}
                  </div>
                </div>

                {/* Progress bar */}
                <ScallopProgress
                  done={c.checklistProgress?.done || 0}
                  total={c.checklistProgress?.applicable || 4}
                  label="Evidence Complete"
                  width={240}
                />

                {/* Next Step Strip */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-xs)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Next Step: </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{nextStepText}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-primary-text)', fontWeight: 600 }}>
                    Details →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

