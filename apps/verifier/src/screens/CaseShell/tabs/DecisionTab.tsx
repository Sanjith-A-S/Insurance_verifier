// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/tabs/DecisionTab.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { ClaimDetail, Decision, DecisionKind } from '@claimlens/shared/types';
import { Button, LoadingState } from '@claimlens/shared/ui';
import { formatCurrency, formatDate } from '@claimlens/shared/utils/format';
import { queryHooks, client } from '../../../client';

export function DecisionTab({
  claim,
}: {
  claim: ClaimDetail;
}) {
  const { data: decisions = [], isLoading, refetch } = queryHooks.useDecisions(claim.id);

  const [decisionKind, setDecisionKind] = useState<DecisionKind>('recommend_approve');
  const [rationale, setRationale] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleRecord = async () => {
    if (!rationale.trim() || submitting) return;
    setSubmitting(true);
    try {
      await client.recordDecision(claim.id, {
        decision: decisionKind,
        rationale: rationale.trim(),
        recommendedAmount: amount ? parseFloat(amount) : undefined,
      });
      setRationale('');
      setAmount('');
      await refetch();
    } catch (err: any) {
      alert(`Failed to record recommendation: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading decision history…" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
      {/* Column 1: Record Recommendation Form */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>
            Record Human Investigation Recommendation
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            AI never issues approvals or rejections. As an investigator, record your reasoned recommendation below.
          </p>
        </div>

        <div>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            Recommended Action
          </label>
          <select
            value={decisionKind}
            onChange={(e) => setDecisionKind(e.target.value as DecisionKind)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: '#fff',
              fontSize: 'var(--text-xs)',
            }}
          >
            <option value="recommend_approve">Recommend Settlement Approval</option>
            <option value="recommend_partial">Recommend Partial Settlement</option>
            <option value="recommend_reject">Recommend Rejection / Repudiation</option>
            <option value="more_information_required">Require Further Formal Investigation</option>
            <option value="closed">Close Claim (No Settlement)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            Recommended Settlement Amount (INR, if applicable)
          </label>
          <input
            type="number"
            placeholder="e.g. 47600"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: '#fff',
              fontSize: 'var(--text-xs)',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            Investigation Rationale & Grounds
          </label>
          <textarea
            rows={5}
            placeholder="Summarize the evidence supporting your recommendation, noting consistency checks, workshop estimates, and policy clauses verified…"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: '#fff',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="filled"
            size="md"
            disabled={!rationale.trim() || submitting}
            onClick={handleRecord}
          >
            {submitting ? 'Recording…' : 'Record Official Recommendation'}
          </Button>
        </div>
      </div>

      {/* Column 2: Audit History of Decisions */}
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
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Decision Audit Log</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
          {decisions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 40 }}>
              No decisions recorded yet for this claim.
            </div>
          ) : (
            decisions.map((dec) => (
              <div
                key={dec.id}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--color-primary-tint)',
                      color: 'var(--color-primary-text)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {dec.decision.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    {formatDate(dec.at)}
                  </span>
                </div>

                {dec.recommendedAmount != null && (
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-accent)' }}>
                    Recommended Amount: {formatCurrency(dec.recommendedAmount)}
                  </div>
                )}

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', lineHeight: 1.5 }}>
                  "{dec.rationale}"
                </div>

                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Recorded by: {dec.actor.name}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

