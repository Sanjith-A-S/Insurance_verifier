import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Card, Button, StatusBadge, Field, Spinner, Empty, Chip } from '../ui.jsx';

export default function SettlementTab({ claim }) {
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Override Form
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrideRationale, setOverrideRationale] = useState('');

  const claimId = claim?.id || claim?._id;

  const loadSettlement = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const data = await api('GET', `/claims/${claimId}/settlement`);
      setSettlement(data);
    } catch (err) {
      console.warn('Settlement load error:', err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadSettlement();
  }, [loadSettlement]);

  const handleRecalculate = async () => {
    setBusy(true);
    try {
      const updated = await api('POST', `/claims/${claimId}/settlement/recalculate`);
      setSettlement(updated);
    } catch (err) {
      console.error('Recalculate failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleApplyOverride = async (e) => {
    e.preventDefault();
    if (!overrideAmount || !overrideRationale) return;
    setBusy(true);

    try {
      const updated = await api('POST', `/claims/${claimId}/settlement/override`, {
        body: {
          amount: parseFloat(overrideAmount),
          rationale: overrideRationale,
        },
      });
      setSettlement(updated);
      setOverrideAmount('');
      setOverrideRationale('');
    } catch (err) {
      console.error('Override failed:', err);
    } finally {
      setBusy(false);
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  const isWithheld = settlement?.status === 'withheld';
  const resultFormatted = settlement?.resultAmount !== null && settlement?.resultAmount !== undefined
    ? `₹${Number(settlement.resultAmount).toLocaleString('en-IN')}`
    : 'WITHHELD';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Banner - Huge Lime Number */}
      <Card
        title="Settlement Loss Assessment"
        subtitle="Deterministic arithmetic based on eligible costs, deductibles and verified policy limits"
        action={
          <Button variant="filled" disabled={busy} onClick={handleRecalculate}>
            {busy ? 'Calculating...' : 'Recalculate Settlement'}
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}><Spinner /></div>
        ) : !settlement ? (
          <Empty
            message="No settlement calculation found. Click Recalculate to generate."
            action={
              <Button variant="filled" onClick={handleRecalculate} style={{ marginTop: 8 }}>
                Generate Calculation
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
            {/* Huge Settlement Display */}
            <div
              style={{
                padding: '24px 28px',
                background: 'var(--surface-raised)',
                borderRadius: '24px',
                border: isWithheld ? '1px solid var(--error)' : '1px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="label-caps" style={{ color: isWithheld ? 'var(--error)' : 'var(--accent)' }}>
                  {isWithheld ? 'Settlement Withheld (Blockers Active)' : 'Calculated Payable Settlement Amount'}
                </div>
                <div
                  className="stat-number"
                  style={{ color: isWithheld ? 'var(--error)' : 'var(--accent)', marginTop: 4 }}
                >
                  {resultFormatted}
                </div>
              </div>
              <StatusBadge status={settlement.status} />
            </div>

            {/* Formula & Assumptions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div style={{ padding: '14px 18px', background: 'var(--surface-raised)', borderRadius: '18px' }}>
                <div className="label-caps">Deterministic Formula</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginTop: 6, color: 'var(--primary-light)' }}>
                  {settlement.formula || 'result = max(0, min(eligible, limit) - deductible)'}
                </div>
              </div>

              <div style={{ padding: '14px 18px', background: 'var(--surface-raised)', borderRadius: '18px' }}>
                <div className="label-caps">Assumptions & Rules</div>
                <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 16, marginTop: 4 }}>
                  {(settlement.assumptions || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Unresolved Blockers */}
            {settlement.unresolved?.length > 0 && (
              <div style={{ padding: '16px 20px', background: 'var(--error-tonal)', borderRadius: '20px', border: '1px solid var(--error)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--error)', marginBottom: 8 }}>
                  Active Settlement Blockers ({settlement.unresolved.length})
                </div>
                <ul style={{ paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text)' }}>
                  {settlement.unresolved.map((u, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <strong>{u.message}</strong>
                      {u.suggestedRequestTitle && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                          (Suggested: {u.suggestedRequestTitle})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Itemised Lines Table */}
            {settlement.lines?.length > 0 && (
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>Itemised Calculation Lines</div>
                <table className="m3-table">
                  <thead>
                    <tr>
                      <th>Line Description</th>
                      <th>Category / Kind</th>
                      <th>Source Document</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.lines.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{l.label}</td>
                        <td><Chip label={l.kind || 'line'} variant="grey" /></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {l.source || '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          ₹{typeof l.value === 'number' ? l.value.toLocaleString('en-IN') : l.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Overrides History */}
            {settlement.overrides?.length > 0 && (
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>Manual Verifier Overrides Log</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {settlement.overrides.map((o, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--surface-raised)',
                        borderRadius: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--accent)', marginRight: 10 }}>
                          ₹{o.amount}
                        </span>
                        <span style={{ fontSize: '0.82rem' }}>{o.rationale}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        By {o.by?.name || 'Verifier'} at {new Date(o.at || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Manual Override Form */}
      <Card title="Record Settlement Override" subtitle="Adjust final assessment amount with required audit rationale">
        <form onSubmit={handleApplyOverride} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
            <Field label="Override Amount (INR)">
              <input
                type="number"
                step="0.01"
                className="m3-input"
                placeholder="e.g. 45000"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                required
              />
            </Field>

            <Field label="Audit Rationale / Explanation">
              <input
                type="text"
                className="m3-input"
                placeholder="Explain justification for overriding the deterministic assessment"
                value={overrideRationale}
                onChange={(e) => setOverrideRationale(e.target.value)}
                required
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="tonal" disabled={busy || !overrideAmount || !overrideRationale}>
              Record Override
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

