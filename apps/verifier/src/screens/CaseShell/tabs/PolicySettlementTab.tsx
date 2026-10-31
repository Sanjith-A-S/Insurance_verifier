// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/tabs/PolicySettlementTab.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { Settlement } from '@claimlens/shared/types';
import { formatCurrency, formatDate } from '@claimlens/shared/utils/format';
import { Button, LoadingState, EmptyState } from '@claimlens/shared/ui';
import { queryHooks, client } from '../../../client';

export function PolicySettlementTab({
  claimId,
  onCreateRequestFromBlocker,
}: {
  claimId: string;
  onCreateRequestFromBlocker: (blocker: { message: string; suggestedRequestTitle?: string | null }) => void;
}) {
  const { data: analysis, isLoading, refetch } = queryHooks.useAnalysis(claimId);

  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrideRationale, setOverrideRationale] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  if (isLoading) return <LoadingState message="Loading policy and settlement assessment…" />;
  if (!analysis) return <EmptyState title="No Analysis Available" message="Run analysis to generate policy and settlement calculations." />;

  const settlement: Settlement | null | undefined = analysis.settlement;
  const isCalculated = settlement?.status === 'calculated';
  const isWithheld = settlement?.status === 'withheld';

  const handleRecalculate = async () => {
    try {
      await client.recalculateSettlement(claimId, analysis.version);
      await refetch();
    } catch (err: any) {
      alert(`Recalculation failed: ${err.message}`);
    }
  };

  const handleSaveOverride = async () => {
    const amt = parseFloat(overrideAmount);
    if (isNaN(amt) || !overrideRationale.trim()) return;
    setSavingOverride(true);
    try {
      await client.overrideSettlement(claimId, amt, overrideRationale.trim());
      setOverrideModal(false);
      setOverrideAmount('');
      setOverrideRationale('');
      await refetch();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setSavingOverride(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Policy Clauses Section */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Applicable Policy Clauses & Endorsements</h3>
        {analysis.policy.clauses.length === 0 ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>No clause interpretations generated.</div>
        ) : (
          analysis.policy.clauses.map((clause, idx) => (
            <div key={idx} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{clause.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>{clause.text}</div>
              {clause.interpretation && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)', marginTop: '8px' }}>
                  <strong>Interpretation:</strong> {clause.interpretation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Settlement Assessment Card */}
      {!settlement ? (
        <EmptyState title="Settlement Not Evaluated" message="No settlement assessment attached to this analysis version." />
      ) : (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: `1px solid ${isCalculated ? 'rgba(182,255,0,0.4)' : 'rgba(239,68,68,0.3)'}`,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mathematical Settlement Assessment
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {isCalculated
                    ? formatCurrency(settlement.resultAmount)
                    : 'Settlement Withheld'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: isCalculated ? 'rgba(182,255,0,0.15)' : 'rgba(239,68,68,0.15)',
                    color: isCalculated ? 'var(--color-accent)' : '#f87171',
                    border: `1px solid ${isCalculated ? 'rgba(182,255,0,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}
                >
                  {isCalculated ? 'CALCULATED' : 'WITHHELD'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outlined" size="sm" onClick={() => setOverrideModal(true)}>
                Record Override
              </Button>
              <Button variant="tonal" size="sm" onClick={handleRecalculate}>
                Recalculate
              </Button>
            </div>
          </div>

          {/* Formula */}
          {settlement.formula && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Formula: {settlement.formula}
            </div>
          )}

          {/* Lines breakdown table */}
          {settlement.lines && settlement.lines.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Line Description</th>
                    <th style={{ padding: '8px 12px' }}>Kind</th>
                    <th style={{ padding: '8px 12px' }}>Source Evidence</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.lines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{line.label}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{line.kind}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-primary-text)', fontFamily: 'var(--font-mono)' }}>{line.source || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(line.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Unresolved Blockers */}
          {isWithheld && settlement.unresolved && settlement.unresolved.length > 0 && (
            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#f87171' }}>
                Unresolved Assessment Blockers ({settlement.unresolved.length})
              </div>
              {settlement.unresolved.map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-text)' }}>• {u.message}</span>
                  <button
                    onClick={() => onCreateRequestFromBlocker(u)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: 'rgba(249,115,22,0.15)',
                      color: '#fb923c',
                      border: '1px solid rgba(249,115,22,0.3)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Draft Request →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Overrides History */}
          {settlement.overrides && settlement.overrides.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Manual Settlement Overrides
              </div>
              {settlement.overrides.map((ov, idx) => (
                <div key={idx} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', fontSize: 'var(--text-xs)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Overridden to {formatCurrency(ov.amount)}: {ov.rationale}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatDate(ov.at as any)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Override Dialog Modal */}
      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-xl)', padding: '24px', maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Record Settlement Override</h3>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Overridden Amount (INR)</label>
              <input
                type="number"
                placeholder="e.g. 45000"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Investigator Rationale</label>
              <textarea
                rows={3}
                placeholder="Explain the reason for overriding the computed formula…"
                value={overrideRationale}
                onChange={(e) => setOverrideRationale(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outlined" size="sm" onClick={() => setOverrideModal(false)}>Cancel</Button>
              <Button variant="filled" size="sm" disabled={!overrideAmount || !overrideRationale.trim() || savingOverride} onClick={handleSaveOverride}>
                {savingOverride ? 'Saving…' : 'Save Override'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

