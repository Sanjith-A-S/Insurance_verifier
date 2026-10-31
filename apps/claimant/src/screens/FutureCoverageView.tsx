// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/FutureCoverageView.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import { Button, LoadingState, ErrorState } from '@claimlens/shared/ui';
import { queryHooks } from '../client';

export function FutureCoverageView({
  claimId,
  onBack,
}: {
  claimId: string;
  onBack: () => void;
}) {
  const { data: rec, isLoading, error } = queryHooks.useRecommendation(claimId);

  if (isLoading) return <LoadingState message="Loading coverage recommendations…" />;
  if (error) return <ErrorState title="Failed to load recommendation" message={error.message} />;

  const content = rec?.content as any;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 100px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary-text)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '8px',
          }}
        >
          ← Back to Claim
        </button>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          Future Coverage Education & Guidance
        </h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Neutral insurance education tailored to motor claims.
        </p>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-text)' }}>
          {content?.summary || 'General educational guidance regarding motor vehicle insurance coverage.'}
        </div>

        {content?.tips && Array.isArray(content.tips) && (
          <div>
            <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary-text)', marginBottom: '8px' }}>
              Key Principles for Future Claims
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {content.tips.map((tip: string, idx: number) => (
                <li key={idx} style={{ lineHeight: 1.5 }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ padding: '12px 16px', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
          Disclaimer: This guidance is for general information only and does not constitute financial advice, insurance policy issuance, or approval of future claims.
        </div>
      </div>
    </div>
  );
}

