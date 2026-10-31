import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Button, StatusBadge, Field, Spinner, Empty, Chip } from '../ui.jsx';

export default function DecisionsRecommendationTab({ claim, onClaimUpdated }) {
  const { identity } = useApp();
  const [decisions, setDecisions] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Decision Form (Verifier)
  const [decision, setDecision] = useState('recommend_approve');
  const [rationale, setRationale] = useState('All facts reconciled and validated against garage estimate and policy.');
  const [recommendedAmount, setRecommendedAmount] = useState('47600');

  // Recommendation Offer Form (Verifier)
  const [offerToClaimant, setOfferToClaimant] = useState(true);

  const isVerifier = identity?.role === 'verifier';
  const isClaimant = identity?.role === 'claimant';
  const claimId = claim?.id || claim?._id;

  const loadData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      if (isVerifier) {
        const dRes = await api('GET', `/claims/${claimId}/decisions`);
        setDecisions(Array.isArray(dRes) ? dRes : dRes.items || []);
      }

      const rRes = await api('GET', `/claims/${claimId}/recommendations`);
      setRecommendation(rRes);
    } catch (err) {
      console.warn('Decisions/Rec load error:', err);
    } finally {
      setLoading(false);
    }
  }, [claimId, isVerifier]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Record Decision
  const handleRecordDecision = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api('POST', `/claims/${claimId}/decisions`, {
        body: {
          decision,
          rationale,
          recommendedAmount: recommendedAmount ? parseFloat(recommendedAmount) : null,
        },
      });
      await loadData();
      onClaimUpdated();
    } catch (err) {
      console.error('Decision failed:', err);
    } finally {
      setBusy(false);
    }
  };

  // Verifier Generates Recommendation Offer
  const handleGenerateOffer = async () => {
    setBusy(true);
    try {
      const data = await api('POST', `/claims/${claimId}/recommendations/offer`, {
        body: { offerToClaimant },
      });
      setRecommendation(data);
    } catch (err) {
      console.error('Generate offer failed:', err);
    } finally {
      setBusy(false);
    }
  };

  // Claimant Requests Guidance
  const handleClaimantRequest = async () => {
    setBusy(true);
    try {
      const data = await api('POST', `/claims/${claimId}/recommendations/request`);
      setRecommendation(data);
    } catch (err) {
      console.error('Claimant rec request failed:', err);
    } finally {
      setBusy(false);
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Verifier Decisions Form & History */}
      {isVerifier && (
        <Card
          title="Adjudication Decisions (Append-Only Log)"
          subtitle="Human verifier final determination and settlement recommendations"
        >
          {/* Record Decision Form */}
          <form
            onSubmit={handleRecordDecision}
            style={{
              padding: '16px',
              background: 'var(--surface-raised)',
              borderRadius: '20px',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Record Formal Adjudication Decision</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Decision Determination">
                <select className="m3-select" value={decision} onChange={(e) => setDecision(e.target.value)}>
                  <option value="recommend_approve">Recommend Full Approval</option>
                  <option value="recommend_partial">Recommend Partial Approval</option>
                  <option value="recommend_reject">Recommend Rejection / Denial</option>
                  <option value="more_information_required">More Information Required</option>
                  <option value="closed">Close Claim File</option>
                </select>
              </Field>

              <Field label="Recommended Payable Amount (INR)">
                <input
                  type="number"
                  className="m3-input"
                  value={recommendedAmount}
                  onChange={(e) => setRecommendedAmount(e.target.value)}
                  placeholder="e.g. 47600"
                />
              </Field>
            </div>

            <Field label="Adjudication Rationale & Notes">
              <textarea
                className="m3-textarea"
                rows={2}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="State the formal reasoning for this decision determination..."
                required
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="filled" disabled={busy || !rationale}>
                {busy ? 'Recording...' : 'Record Decision'}
              </Button>
            </div>
          </form>

          {/* Decisions History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {decisions.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No decisions logged yet.</div>
            ) : (
              decisions.map((d, idx) => (
                <div
                  key={d.id || idx}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--surface-raised)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        {d.decision?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {d.recommendedAmount !== null && d.recommendedAmount !== undefined && (
                        <Chip label={`₹${Number(d.recommendedAmount).toLocaleString('en-IN')}`} variant="lime" />
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      By {d.actor?.name || 'Verifier'} • {new Date(d.at || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.rationale}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Future-Cover Recommendations */}
      <Card
        title="Future Coverage Considerations"
        subtitle="Unbiased general insurance education without commercial pricing or policy modification"
        action={
          isVerifier ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={offerToClaimant}
                  onChange={(e) => setOfferToClaimant(e.target.checked)}
                />
                Offer to Claimant
              </label>
              <Button variant="tonal" size="s" disabled={busy} onClick={handleGenerateOffer}>
                Generate Options
              </Button>
            </div>
          ) : (
            isClaimant && (
              <Button variant="filled" size="s" disabled={busy} onClick={handleClaimantRequest}>
                Request Guidance
              </Button>
            )
          )
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>
        ) : !recommendation || !recommendation.content ? (
          <Empty
            message="No future coverage recommendations generated yet"
            action={
              isClaimant && (
                <Button variant="filled" size="s" onClick={handleClaimantRequest} style={{ marginTop: 8 }}>
                  Request Educational Options
                </Button>
              )
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Notice Banner */}
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--primary-tonal)',
                border: '1px solid var(--primary)',
                borderRadius: '16px',
                fontSize: '0.82rem',
                color: 'var(--primary-light)',
              }}
            >
              <strong>Notice:</strong> {recommendation.content.notice}
            </div>

            {/* Options List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {(recommendation.content.options || []).map((opt) => (
                <div
                  key={opt.code}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--surface-raised)',
                    borderRadius: '18px',
                    border: '1px solid var(--surface-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                      {opt.title}
                    </span>
                    <Chip label={opt.code} variant="cobalt" />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {opt.explanation}
                  </div>
                  {opt.relevanceToIncident && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 4 }}>
                      Relevance: {opt.relevanceToIncident}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Assumptions (Verifier view only) */}
            {isVerifier && recommendation.assumptions?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="label-caps">Verifier Audit Assumptions</div>
                <ul style={{ paddingLeft: 18, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {recommendation.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

